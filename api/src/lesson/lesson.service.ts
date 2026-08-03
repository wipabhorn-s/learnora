import { StatusCourse } from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { CreateLessonDto } from '@/lesson/dto/create-lesson.dto';
import { MoveLessonDto } from '@/lesson/dto/move-lesson.dto';
import { UpdateLessonDto } from '@/lesson/dto/update-lesson.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async findOwnedCourse(instructorId: string, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.status === StatusCourse.DELETED) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('This is not your course');
    }

    return course;
  }

  private async findOwnedLesson(instructorId: string, lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson || lesson.course.status === StatusCourse.DELETED) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.instructorId !== instructorId) {
      throw new ForbiddenException('This is not your lesson');
    }

    return lesson;
  }

  async createLesson(
    instructorId: string,
    dto: CreateLessonDto,
    videoFile: Express.Multer.File,
  ) {
    await this.findOwnedCourse(instructorId, dto.courseId);

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { courseId: dto.courseId },
      orderBy: { orderNo: 'desc' },
      select: { orderNo: true },
    });

    const video = await this.cloudinaryService.uploadVideo(videoFile);

    try {
      return await this.prisma.lesson.create({
        data: {
          courseId: dto.courseId,
          title: dto.title,
          videoUrl: video.url,
          videoPublicId: video.publicId,
          durationSeconds: video.durationSeconds,
          orderNo: (lastLesson?.orderNo ?? 0) + 1,
        },
        omit: { videoPublicId: true },
      });
    } catch (error) {
      await this.cloudinaryService.deleteAsset(video.publicId, 'video');
      throw error;
    }
  }

  async updateLesson(
    instructorId: string,
    lessonId: number,
    dto: UpdateLessonDto,
    videoFile?: Express.Multer.File,
  ) {
    const lesson = await this.findOwnedLesson(instructorId, lessonId);

    if (dto.title === undefined && !videoFile) {
      throw new BadRequestException('Title or video file is required');
    }

    const video = videoFile
      ? await this.cloudinaryService.uploadVideo(videoFile)
      : undefined;

    try {
      const updatedLesson = await this.prisma.lesson.update({
        where: {
          id: lessonId,
        },
        data: {
          ...dto,

          ...(video && {
            videoUrl: video.url,
            videoPublicId: video.publicId,
            durationSeconds: video.durationSeconds,
          }),
        },
        omit: { videoPublicId: true },
      });

      if (video) {
        const oldVideoPublicId =
          lesson.videoPublicId ??
          this.cloudinaryService.getPublicIdFromUrl(lesson.videoUrl, 'video');

        await this.cloudinaryService.deleteAsset(oldVideoPublicId, 'video');
      }

      return updatedLesson;
    } catch (error) {
      await this.cloudinaryService.deleteAsset(video?.publicId, 'video');
      throw error;
    }
  }

  async removeLesson(instructorId: string, lessonId: number) {
    const lesson = await this.findOwnedLesson(instructorId, lessonId);

    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.delete({
        where: {
          id: lessonId,
        },
      });

      const remainingLessons = await tx.lesson.findMany({
        where: {
          courseId: lesson.courseId,
        },
        orderBy: {
          orderNo: 'asc',
        },
        select: {
          id: true,
        },
      });

      for (const item of remainingLessons) {
        await tx.lesson.update({
          where: {
            id: item.id,
          },
          data: {
            orderNo: -item.id,
          },
        });
      }

      for (const [index, item] of remainingLessons.entries()) {
        await tx.lesson.update({
          where: {
            id: item.id,
          },
          data: {
            orderNo: index + 1,
          },
        });
      }
    });

    const videoPublicId =
      lesson.videoPublicId ??
      this.cloudinaryService.getPublicIdFromUrl(lesson.videoUrl, 'video');

    await this.cloudinaryService.deleteAsset(videoPublicId, 'video');

    return {
      message: 'Lesson deleted successfully',
    };
  }

  async moveLesson(instructorId: string, lessonId: number, dto: MoveLessonDto) {
    const lesson = await this.findOwnedLesson(instructorId, lessonId);

    const lessons = await this.prisma.lesson.findMany({
      where: {
        courseId: lesson.courseId,
      },
      orderBy: {
        orderNo: 'asc',
      },
      select: {
        id: true,
        orderNo: true,
      },
    });

    if (dto.orderNo > lessons.length) {
      throw new BadRequestException(
        `orderNo must be between 1 and ${lessons.length}`,
      );
    }

    const currentIndex = lessons.findIndex((item) => item.id === lessonId);

    const targetIndex = dto.orderNo - 1;

    if (currentIndex === targetIndex) {
      return this.prisma.lesson.findMany({
        where: {
          courseId: lesson.courseId,
        },
        orderBy: {
          orderNo: 'asc',
        },
        omit: { videoPublicId: true },
      });
    }

    const reorderedLessons = [...lessons];

    const [movedLesson] = reorderedLessons.splice(currentIndex, 1);

    reorderedLessons.splice(targetIndex, 0, movedLesson);

    await this.prisma.$transaction(async (tx) => {
      for (const item of reorderedLessons) {
        await tx.lesson.update({
          where: {
            id: item.id,
          },
          data: {
            orderNo: -item.id,
          },
        });
      }

      for (const [index, item] of reorderedLessons.entries()) {
        await tx.lesson.update({
          where: {
            id: item.id,
          },
          data: {
            orderNo: index + 1,
          },
        });
      }
    });

    return this.prisma.lesson.findMany({
      where: {
        courseId: lesson.courseId,
      },
      orderBy: {
        orderNo: 'asc',
      },
      omit: { videoPublicId: true },
    });
  }
}
