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

  createVideoUpload(instructorId: string) {
    return this.cloudinaryService.createVideoUploadTicket(instructorId);
  }

  /**
   * รับวิดีโอที่เบราว์เซอร์อัปโหลดตรงไป Cloudinary มาใช้กับบทเรียน
   * ต้องเป็นไฟล์ที่ผู้สอนคนนี้อัปโหลดด้วยใบอนุญาตของเรา และยังไม่ถูกใช้กับบทเรียนอื่น
   * (ใช้ซ้ำไม่ได้ ไม่งั้นลบบทเรียนหนึ่งแล้ววิดีโอของอีกบทจะหายไปด้วย)
   */
  private async claimUploadedVideo(instructorId: string, publicId: string) {
    if (!this.cloudinaryService.isVideoUploadedBy(instructorId, publicId)) {
      throw new BadRequestException(
        'We could not find the uploaded video. Please upload it again.',
      );
    }

    const usedBy = await this.prisma.lesson.findFirst({
      where: { videoPublicId: publicId },
      select: { id: true },
    });
    if (usedBy) {
      throw new BadRequestException(
        'This video is already used by another lesson',
      );
    }

    return this.cloudinaryService.getUploadedVideo(publicId);
  }

  async createLesson(instructorId: string, dto: CreateLessonDto) {
    await this.findOwnedCourse(instructorId, dto.courseId);

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { courseId: dto.courseId },
      orderBy: { orderNo: 'desc' },
      select: { orderNo: true },
    });

    const video = await this.claimUploadedVideo(
      instructorId,
      dto.videoPublicId,
    );

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
      await this.cloudinaryService.deleteAsset(
        video.publicId,
        'video',
        'authenticated',
      );
      throw error;
    }
  }

  async updateLesson(
    instructorId: string,
    lessonId: number,
    { videoPublicId, ...dto }: UpdateLessonDto,
  ) {
    const lesson = await this.findOwnedLesson(instructorId, lessonId);

    if (dto.title === undefined && !videoPublicId) {
      throw new BadRequestException('Title or video is required');
    }

    const video = videoPublicId
      ? await this.claimUploadedVideo(instructorId, videoPublicId)
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

        await this.cloudinaryService.deleteAsset(
          oldVideoPublicId,
          'video',
          this.cloudinaryService.deliveryTypeOf(lesson.videoUrl),
        );
      }

      return updatedLesson;
    } catch (error) {
      await this.cloudinaryService.deleteAsset(
        video?.publicId,
        'video',
        'authenticated',
      );
      throw error;
    }
  }

  async removeLesson(instructorId: string, lessonId: number) {
    const lesson = await this.findOwnedLesson(instructorId, lessonId);

    // คอร์สที่ขายอยู่ต้องมีบทเรียนเสมอ (กติกาเดียวกับตอนกดเผยแพร่)
    // ลบบทสุดท้ายได้เฉพาะตอนเป็น Draft ผู้สอนจะได้รู้ตัวว่าคอร์สเลิกขายแล้ว
    if (lesson.course.status === StatusCourse.PUBLISHED) {
      const lessonCount = await this.prisma.lesson.count({
        where: { courseId: lesson.courseId },
      });

      if (lessonCount <= 1) {
        throw new BadRequestException(
          'A published course needs at least one lesson. Move the course back to draft before deleting its last lesson.',
        );
      }
    }

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

    await this.cloudinaryService.deleteAsset(
      videoPublicId,
      'video',
      this.cloudinaryService.deliveryTypeOf(lesson.videoUrl),
    );

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
