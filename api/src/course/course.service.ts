import { CreateCourseDto } from '@/course/dto/create-course.dto';
import { CourseSort, FindCoursesDto } from '@/course/dto/find-courses.dto';
import { UpdateCourseStatusDto } from '@/course/dto/update-course-status.dto';
import { UpdateCourseDto } from '@/course/dto/update-course.dto';
import {
  AccessType,
  EnrollmentStatus,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { Prisma } from '@/database/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pageCount, pageQuery } from '@/common/utils/pagination';

/**
 * ทุกแบบปิดท้ายด้วย id เพื่อให้ลำดับคงที่ตอนค่าเท่ากัน (ราคาเท่ากันหลายคอร์ส)
 * ไม่งั้นคอร์สเดียวกันอาจโผล่ซ้ำหรือหายไปเวลาเปลี่ยนหน้า
 */
const COURSE_ORDER: Record<
  CourseSort,
  Prisma.CourseOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  'price-asc': [{ price: 'asc' }, { id: 'desc' }],
  'price-desc': [{ price: 'desc' }, { id: 'desc' }],
};

/**
 * นับเฉพาะคนที่จ่ายสำเร็จ (คอร์สฟรีก็นับ) ไม่นับรายการที่ค้าง/คืนเงินแล้ว
 * คืนเงินรายคอร์สได้ คำสั่งซื้อจึงยัง SUCCESS อยู่ ต้องดูสถานะของคอร์สด้วย
 */
const PAID_ENROLLMENT = {
  purchase: { paymentStatus: PaymentStatus.SUCCESS },
  enrollmentStatus: { not: EnrollmentStatus.REFUNDED },
} satisfies Prisma.PurchaseItemWhereInput;

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
        orderBy: COURSE_ORDER[dto.sort ?? 'newest'],
        ...pageQuery(page, limit),
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
      totalPages: pageCount(total, limit),
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

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      omit: { thumbnailPublicId: true },
      include: {
        lessons: {
          select: {
            id: true,
            courseId: true,
            title: true,
            videoUrl: true,
            videoPublicId: true,
            durationSeconds: true,
            orderNo: true,
          },
          orderBy: { orderNo: 'asc' },
        },
      },
    });
    if (!course) return course;

    // ผู้สอนดูตัวอย่างคอร์สตัวเองก็ได้ลิงก์ที่หมดอายุเหมือนผู้เรียน
    return {
      ...course,
      lessons: course.lessons.map(({ videoPublicId, ...lesson }) => ({
        ...lesson,
        videoUrl: this.cloudinaryService.signedVideoUrl(
          videoPublicId ??
            this.cloudinaryService.getPublicIdFromUrl(
              lesson.videoUrl,
              'video',
            ) ??
            '',
          lesson.videoUrl,
        ),
      })),
    };
  }

  async findCourse(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      omit: { thumbnailPublicId: true },
      include: {
        instructor: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            bio: true,
          },
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

    const [studentCount, instructorStats] = await Promise.all([
      this.prisma.purchaseItem.count({
        where: { courseId, ...PAID_ENROLLMENT },
      }),
      this.instructorStats(course.instructorId),
    ]);

    return {
      ...course,
      studentCount,
      instructor: { ...course.instructor, ...instructorStats },
    };
  }

  /** จำนวนคอร์สที่เปิดขายอยู่ และจำนวนผู้เรียนทั้งหมดของผู้สอน */
  private async instructorStats(instructorId: string) {
    const [courseCount, students] = await Promise.all([
      this.prisma.course.count({
        where: { instructorId, status: StatusCourse.PUBLISHED },
      }),
      // คนเดียวซื้อหลายคอร์สของผู้สอนคนนี้ นับเป็นหนึ่งคน
      this.prisma.purchaseItem.findMany({
        where: { course: { instructorId }, ...PAID_ENROLLMENT },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
    ]);

    return { courseCount, studentCount: students.length };
  }

  /**
   * หน้าโปรไฟล์ผู้สอนแบบสาธารณะ: ข้อมูลแนะนำตัว ตัวเลขสรุป และคอร์สที่เปิดขายอยู่
   * ไม่ใช่ผู้สอน หรือบัญชีถูกระงับ = ไม่พบ (ไม่บอกว่ามีบัญชีนี้อยู่)
   */
  async findInstructorProfile(instructorId: string) {
    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        isInstructor: true,
        status: true,
      },
    });

    if (!instructor?.isInstructor || !instructor.status) {
      throw new NotFoundException('Instructor not found');
    }

    const [stats, courses] = await Promise.all([
      this.instructorStats(instructorId),
      this.prisma.course.findMany({
        where: { instructorId, status: StatusCourse.PUBLISHED },
        omit: { thumbnailPublicId: true },
        orderBy: COURSE_ORDER.newest,
        include: {
          instructor: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const {
      isInstructor: _isInstructor,
      status: _status,
      ...profile
    } = instructor;
    return { ...profile, ...stats, courses };
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
          subtitle: dto.subtitle || null,
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
          ...(dto.subtitle !== undefined && { subtitle: dto.subtitle || null }),
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
      where: { courseId, ...PAID_ENROLLMENT },
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

    // คอร์สที่ไม่มีบทเรียนเลยขายได้ถ้าไม่กันไว้ ผู้เรียนจ่ายเงินแล้วได้คอร์สว่าง
    // หน้าเว็บมี checklist บอกก่อนแล้ว แต่ต้องบังคับที่นี่ด้วยเพราะเรียก API ตรงได้
    if (dto.status === StatusCourse.PUBLISHED) {
      const lessonCount = await this.prisma.lesson.count({
        where: { courseId },
      });

      if (lessonCount === 0) {
        throw new BadRequestException(
          'Add at least one lesson before publishing this course',
        );
      }
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: dto.status },
      omit: { thumbnailPublicId: true },
    });
  }
}
