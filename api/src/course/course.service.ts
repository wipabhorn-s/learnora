import { CreateCourseDto } from '@/course/dto/create-course.dto';
import { FindCoursesDto } from '@/course/dto/find-courses.dto';
import { UpdateCourseStatusDto } from '@/course/dto/update-course-status.dto';
import { UpdateCourseDto } from '@/course/dto/update-course.dto';
import {
  AccessType,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAllCourses(dto: FindCoursesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 6;

    const where = {
      status: StatusCourse.PUBLISHED,

      ...(dto.category && {
        category: dto.category,
      }),

      ...(dto.level && {
        level: dto.level,
      }),

      ...(dto.accessType && {
        accessType: dto.accessType,
      }),

      ...(dto.search && {
        OR: [
          {
            title: {
              contains: dto.search,
              mode: 'insensitive' as const,
            },
          },
          {
            instructor: {
              firstName: {
                contains: dto.search,
                mode: 'insensitive' as const,
              },
            },
          },
          {
            instructor: {
              lastName: {
                contains: dto.search,
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      }),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        omit: { thumbnailPublicId: true },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          instructor: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),

      this.prisma.course.count({
        where,
      }),
    ]);

    return {
      courses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  findMyCourses(instructorId: string) {
    return this.prisma.course.findMany({
      where: {
        instructorId,
        status: { not: StatusCourse.DELETED },
      },
      orderBy: { createdAt: 'desc' },
      omit: { thumbnailPublicId: true },
    });
  }

  async findMyCourse(instructorId: string, courseId: number) {
    await this.findOwnedCourse(instructorId, courseId);

    return this.prisma.course.findUnique({
      where: { id: courseId },
      omit: { thumbnailPublicId: true },
      include: {
        lessons: {
          select: {
            id: true,
            courseId: true,
            title: true,
            videoUrl: true,
            durationSeconds: true,
            orderNo: true,
          },
          orderBy: { orderNo: 'asc' },
        },
      },
    });
  }

  async findCourse(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      omit: { thumbnailPublicId: true },
      include: {
        instructor: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        lessons: {
          select: {
            id: true,
            title: true,
            durationSeconds: true,
            orderNo: true,
          },
          orderBy: { orderNo: 'asc' },
        },
      },
    });

    if (!course || course.status !== StatusCourse.PUBLISHED) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async createCourse(
    instructorId: string,
    dto: CreateCourseDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    const thumbnail = thumbnailFile
      ? await this.cloudinaryService.upload(thumbnailFile)
      : undefined;

    try {
      return await this.prisma.course.create({
        data: {
          ...dto,
          instructorId,
          thumbnailUrl: thumbnail?.url ?? null,
          thumbnailPublicId: thumbnail?.publicId ?? null,
          accessDuration:
            dto.accessType === AccessType.LIMITED ? dto.accessDuration : null,
        },
        omit: { thumbnailPublicId: true },
      });
    } catch (error) {
      await this.cloudinaryService.deleteAsset(thumbnail?.publicId);
      throw error;
    }
  }

  private async findOwnedCourse(
    instructorId: string,
    courseId: number,
    options?: { allowDeleted?: boolean },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status === StatusCourse.DELETED && !options?.allowDeleted) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('This is not your course');
    }

    return course;
  }

  async updateCourse(
    instructorId: string,
    courseId: number,
    dto: UpdateCourseDto,
    thumbnailFile?: Express.Multer.File,
  ) {
    const course = await this.findOwnedCourse(instructorId, courseId);

    const accessType = dto.accessType ?? course.accessType;

    const accessDuration =
      accessType === AccessType.LIMITED
        ? (dto.accessDuration ?? course.accessDuration)
        : null;

    if (accessType === AccessType.LIMITED && !accessDuration) {
      throw new BadRequestException(
        'accessDuration is required when accessType is LIMITED',
      );
    }

    const thumbnail = thumbnailFile
      ? await this.cloudinaryService.upload(thumbnailFile)
      : undefined;

    try {
      const updatedCourse = await this.prisma.course.update({
        where: { id: courseId },
        data: {
          ...dto,
          ...(thumbnail && {
            thumbnailUrl: thumbnail.url,
            thumbnailPublicId: thumbnail.publicId,
          }),
          accessDuration,
        },
        omit: { thumbnailPublicId: true },
      });

      if (thumbnail) {
        const oldThumbnailPublicId =
          course.thumbnailPublicId ??
          this.cloudinaryService.getPublicIdFromUrl(course.thumbnailUrl);

        await this.cloudinaryService.deleteAsset(oldThumbnailPublicId);
      }

      return updatedCourse;
    } catch (error) {
      await this.cloudinaryService.deleteAsset(thumbnail?.publicId);
      throw error;
    }
  }

  async removeCourse(instructorId: string, courseId: number) {
    const course = await this.findOwnedCourse(instructorId, courseId, {
      allowDeleted: true,
    });

    if (course.status === StatusCourse.DELETED) {
      throw new ConflictException('This course has already been deleted');
    }

    const purchaseCount = await this.prisma.purchaseItem.count({
      where: {
        courseId,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
    });

    if (purchaseCount > 0) {
      throw new ConflictException(
        'This course has enrolled students and cannot be deleted. Unpublish it instead.',
      );
    }

    await this.prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        status: StatusCourse.DELETED,
        thumbnailUrl: null,
        thumbnailPublicId: null,
      },
    });

    const thumbnailPublicId =
      course.thumbnailPublicId ??
      this.cloudinaryService.getPublicIdFromUrl(course.thumbnailUrl);

    await this.cloudinaryService.deleteAsset(thumbnailPublicId);

    return {
      message: 'Course deleted successfully',
    };
  }

  async updateCourseStatus(
    instructorId: string,
    courseId: number,
    dto: UpdateCourseStatusDto,
  ) {
    const course = await this.findOwnedCourse(instructorId, courseId);

    if (course.status === StatusCourse.SUSPENDED) {
      throw new ForbiddenException(
        'This course has been suspended by an admin',
      );
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: dto.status },
      omit: { thumbnailPublicId: true },
    });
  }
}
