import {
  EnrollmentStatus,
  PaymentStatus,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { UpdateProgressDto } from '@/learning/dto/update-progress.dto';
import { FindEnrolledCoursesDto } from '@/learning/dto/find-enrolled-courses.dto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const ENROLLED_COURSE_SELECT = {
  id: true,
  expiresAt: true,
  enrollmentStatus: true,
  course: {
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      instructor: { select: { firstName: true, lastName: true } },
      lessons: { select: { id: true, durationSeconds: true } },
    },
  },
  lessonProgresses: { select: { lessonId: true, maxWatchedSeconds: true } },
} as const;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  private async findActivePurchaseItem(studentId: string, courseId: number) {
    const purchaseItem = await this.prisma.purchaseItem.findFirst({
      where: {
        studentId,
        courseId,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      orderBy: { id: 'desc' },
    });

    if (!purchaseItem) {
      throw new NotFoundException('You have not purchased this course');
    }

    return purchaseItem;
  }

  private refreshEnrollmentStatus<
    T extends {
      id: string;
      enrollmentStatus: EnrollmentStatus;
      expiresAt: Date | null;
    },
  >(item: T): T {
    const isExpired =
      item.enrollmentStatus === EnrollmentStatus.ACTIVE &&
      item.expiresAt !== null &&
      item.expiresAt.getTime() < Date.now();

    if (isExpired) {
      // เขียนกลับตอนที่ตรวจพบครั้งแรก ครั้งต่อไปจุดอื่น (เช่น cart) จะเห็นค่าที่ถูกต้องแล้วโดยไม่ต้องเช็ค expiresAt เอง
      this.prisma.purchaseItem
        .update({
          where: { id: item.id },
          data: { enrollmentStatus: EnrollmentStatus.EXPIRED },
        })
        .catch(() => {});
    }

    return isExpired
      ? { ...item, enrollmentStatus: EnrollmentStatus.EXPIRED }
      : item;
  }

  async findEnrolledCourses(studentId: string, dto: FindEnrolledCoursesDto) {
    const activePage = dto.activePage ?? 1;
    const expiredPage = dto.expiredPage ?? 1;
    const limit = 3;
    const now = new Date();
    const purchaseWhere = { paymentStatus: PaymentStatus.SUCCESS };
    const activeWhere = {
      studentId,
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      purchase: purchaseWhere,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    // courseId ที่มี enrollment ใหม่ (renew แล้ว) ยัง active อยู่ ต้องไม่โผล่ซ้ำใน Expired
    const activeCourseIdRows = await this.prisma.purchaseItem.findMany({
      where: activeWhere,
      select: { courseId: true },
    });
    const activeCourseIds = activeCourseIdRows.map((row) => row.courseId);

    const expiredWhere = {
      studentId,
      purchase: purchaseWhere,
      courseId: { notIn: activeCourseIds },
      OR: [
        { enrollmentStatus: EnrollmentStatus.EXPIRED },
        {
          enrollmentStatus: EnrollmentStatus.ACTIVE,
          expiresAt: { lte: now },
        },
      ],
    };

    const [activeItems, activeTotal, expiredItems, expiredTotal] =
      await Promise.all([
        this.prisma.purchaseItem.findMany({
          where: activeWhere,
          orderBy: { course: { title: 'asc' } },
          skip: (activePage - 1) * limit,
          take: limit,
          select: ENROLLED_COURSE_SELECT,
        }),
        this.prisma.purchaseItem.count({ where: activeWhere }),
        this.prisma.purchaseItem.findMany({
          where: expiredWhere,
          orderBy: { course: { title: 'asc' } },
          skip: (expiredPage - 1) * limit,
          take: limit,
          select: ENROLLED_COURSE_SELECT,
        }),
        this.prisma.purchaseItem.count({ where: expiredWhere }),
      ]);

    const withProgress = (item: (typeof activeItems)[number]) => {
      const refreshed = this.refreshEnrollmentStatus(item);

      const totalDuration = refreshed.course.lessons.reduce(
        (sum, lesson) => sum + lesson.durationSeconds,
        0,
      );
      const durationById = new Map(
        refreshed.course.lessons.map((lesson) => [
          lesson.id,
          lesson.durationSeconds,
        ]),
      );
      const totalWatched = refreshed.lessonProgresses.reduce(
        (sum, progress) => {
          const duration = durationById.get(progress.lessonId) ?? 0;
          return sum + Math.min(progress.maxWatchedSeconds, duration);
        },
        0,
      );

      const { lessons, ...courseRest } = refreshed.course;
      const { lessonProgresses, ...itemRest } = refreshed;

      return {
        ...itemRest,
        course: { ...courseRest, lessonCount: lessons.length },
        progressPercent:
          totalDuration === 0
            ? 0
            : Math.round((totalWatched / totalDuration) * 100),
      };
    };

    return {
      active: {
        items: activeItems.map(withProgress),
        total: activeTotal,
        page: activePage,
        totalPages: Math.ceil(activeTotal / limit),
      },
      expired: {
        items: expiredItems.map(withProgress),
        total: expiredTotal,
        page: expiredPage,
        totalPages: Math.ceil(expiredTotal / limit),
      },
    };
  }

  async getCoursePlayer(studentId: string, courseId: number) {
    const purchaseItem = await this.findActivePurchaseItem(studentId, courseId);
    const refreshed = this.refreshEnrollmentStatus(purchaseItem);

    if (refreshed.enrollmentStatus !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Your access to this course has expired. Please renew to continue.',
      );
    }

    const [course, progress] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { orderNo: 'asc' },
            select: {
              id: true,
              title: true,
              videoUrl: true,
              durationSeconds: true,
              orderNo: true,
            },
          },
        },
      }),
      this.prisma.lessonProgress.findMany({
        where: { purchaseItemId: purchaseItem.id },
      }),
    ]);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const progressByLessonId = new Map(progress.map((p) => [p.lessonId, p]));

    return {
      course: { id: course.id, title: course.title },
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        progress: progressByLessonId.get(lesson.id) ?? {
          lastPositionSeconds: 0,
          maxWatchedSeconds: 0,
          isCompleted: false,
        },
      })),
    };
  }

  async updateProgress(
    studentId: string,
    lessonId: number,
    dto: UpdateProgressDto,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const purchaseItem = await this.findActivePurchaseItem(
      studentId,
      lesson.courseId,
    );
    const refreshed = this.refreshEnrollmentStatus(purchaseItem);

    if (refreshed.enrollmentStatus !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Your access to this course has expired');
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: {
        purchaseItemId_lessonId: {
          purchaseItemId: purchaseItem.id,
          lessonId,
        },
      },
    });

    const maxWatchedSeconds = Math.max(
      existing?.maxWatchedSeconds ?? 0,
      dto.lastPositionSeconds,
    );
    const isCompleted = maxWatchedSeconds / lesson.durationSeconds >= 0.9;

    return this.prisma.lessonProgress.upsert({
      where: {
        purchaseItemId_lessonId: {
          purchaseItemId: purchaseItem.id,
          lessonId,
        },
      },
      create: {
        purchaseItemId: purchaseItem.id,
        lessonId,
        lastPositionSeconds: dto.lastPositionSeconds,
        maxWatchedSeconds,
        isCompleted,
      },
      update: {
        lastPositionSeconds: dto.lastPositionSeconds,
        maxWatchedSeconds,
        isCompleted,
      },
    });
  }
}
