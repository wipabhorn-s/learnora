import { PrismaService } from '@/database/prisma.service';
import {
  EnrollmentStatus,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { Prisma } from '@/database/generated/prisma/client';
import { FindStudentDashboardDto } from '@/dashboard/dto/find-student-dashboard.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDashboard(studentId: string, dto: FindStudentDashboardDto) {
    const purchaseItems = await this.prisma.purchaseItem.findMany({
      where: {
        studentId,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      orderBy: { id: 'desc' },
      select: {
        expiresAt: true,
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            lessons: { select: { id: true, durationSeconds: true } },
          },
        },
        lessonProgresses: {
          select: { lessonId: true, maxWatchedSeconds: true },
        },
      },
    });

    const now = Date.now();

    const active = purchaseItems.filter(
      (item) => item.expiresAt === null || item.expiresAt.getTime() > now,
    );

    let totalWatchedSeconds = 0;
    let completedCount = 0;
    const continueLearningItems: Array<{
      courseId: number;
      title: string;
      thumbnailUrl: string | null;
      progressPercent: number;
    }> = [];

    for (const item of active) {
      const totalDuration = item.course.lessons.reduce(
        (sum, l) => sum + l.durationSeconds,
        0,
      );
      const durationById = new Map(
        item.course.lessons.map((l) => [l.id, l.durationSeconds]),
      );
      const totalWatched = item.lessonProgresses.reduce((sum, p) => {
        const duration = durationById.get(p.lessonId) ?? 0;
        return sum + Math.min(p.maxWatchedSeconds, duration);
      }, 0);

      totalWatchedSeconds += totalWatched;
      const progressPercent =
        totalDuration === 0
          ? 0
          : Math.round((totalWatched / totalDuration) * 100);

      if (progressPercent === 100) completedCount++;

      if (progressPercent < 100) {
        continueLearningItems.push({
          courseId: item.course.id,
          title: item.course.title,
          thumbnailUrl: item.course.thumbnailUrl,
          progressPercent,
        });
      }
    }

    const limit = 3;
    const total = continueLearningItems.length;
    const totalPages = Math.ceil(total / limit);
    const requestedPage = dto.page ?? 1;
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const items = continueLearningItems.slice((page - 1) * limit, page * limit);

    return {
      enrolledCount: active.length,
      completedCount,
      hoursLearned: Math.round((totalWatchedSeconds / 3600) * 10) / 10,
      continueLearning: { items, total, page, totalPages },
    };
  }

  async getInstructorDashboard(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId, status: { not: StatusCourse.DELETED } },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);

    const where = {
      courseId: { in: courseIds },
      purchase: { paymentStatus: PaymentStatus.SUCCESS },
    };

    // ต้องดึงมาทั้งหมดแยกจาก recentEnrollments เพราะ totalRevenue/totalStudents
    // ต้องคิดจาก enrollment ทั้งหมด ไม่ใช่แค่หน้าที่กำลังโชว์
    const [allForTotals, total] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where,
        select: { price: true, studentId: true },
      }),
      this.prisma.purchaseItem.count({ where }),
    ]);

    const recentEnrollments = await this.prisma.purchaseItem.findMany({
      where,
      orderBy: { id: 'desc' },
      select: {
        price: true,
        course: { select: { title: true } },
        student: { select: { firstName: true, lastName: true } },
        purchase: { select: { purchasedAt: true } },
      },
    });

    const totalRevenue = allForTotals.reduce(
      (sum, item) => sum.add(item.price),
      new Prisma.Decimal(0),
    );
    const totalStudents = new Set(allForTotals.map((i) => i.studentId)).size;

    return {
      totalCourses: courseIds.length,
      totalStudents,
      totalRevenue: totalRevenue.toString(),
      recentEnrollments: {
        items: recentEnrollments.map((item) => ({
          studentName: `${item.student.firstName} ${item.student.lastName}`,
          courseTitle: item.course.title,
          price: item.price.toString(),
          purchasedAt: item.purchase.purchasedAt,
        })),
        total,
        page: 1,
        totalPages: total === 0 ? 0 : 1,
      },
    };
  }
}
