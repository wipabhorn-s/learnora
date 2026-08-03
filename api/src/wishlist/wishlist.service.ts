import {
  EnrollmentStatus,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { AddToWishlistDto } from '@/wishlist/dto/add-to-wishlist.dto';
import { FindWishlistDto } from '@/wishlist/dto/find-wishlist.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const COURSE_SELECT = {
  id: true,
  title: true,
  price: true,
  thumbnailUrl: true,
  category: true,
  level: true,
  accessType: true,
  accessDuration: true,
  status: true,
  instructor: {
    select: { firstName: true, lastName: true, avatarUrl: true },
  },
} as const;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findWishlistCourseIds(studentId: string) {
    const [items, activeEnrollments] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { studentId },
        select: { courseId: true },
      }),
      this.prisma.purchaseItem.findMany({
        where: {
          studentId,
          enrollmentStatus: EnrollmentStatus.ACTIVE,
          purchase: { paymentStatus: PaymentStatus.SUCCESS },
        },
        select: { courseId: true },
      }),
    ]);

    const ownedCourseIds = new Set(
      activeEnrollments.map((item) => item.courseId),
    );

    return items
      .map((item) => item.courseId)
      .filter((courseId) => !ownedCourseIds.has(courseId));
  }

  async findWishlist(studentId: string, dto: FindWishlistDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 8;

    const activeEnrollments = await this.prisma.purchaseItem.findMany({
      where: {
        studentId,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      select: { courseId: true },
    });

    const ownedCourseIds = new Set(
      activeEnrollments.map((item) => item.courseId),
    );

    const where = {
      studentId,
      ...(ownedCourseIds.size > 0 && {
        courseId: { notIn: [...ownedCourseIds] },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          course: { select: COURSE_SELECT },
        },
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        isAvailable: item.course.status === StatusCourse.PUBLISHED,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addToWishlist(studentId: string, dto: AddToWishlistDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { status: true },
    });

    if (!course || course.status !== StatusCourse.PUBLISHED) {
      throw new NotFoundException('Course not found');
    }

    const activeEnrollment = await this.prisma.purchaseItem.findFirst({
      where: {
        studentId,
        courseId: dto.courseId,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      select: { id: true },
    });

    if (activeEnrollment) {
      throw new ConflictException('You already own this course');
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: dto.courseId },
      },
    });

    if (existing) {
      throw new ConflictException('This course is already in your wishlist');
    }

    await this.prisma.wishlist.create({
      data: { studentId, courseId: dto.courseId },
    });

    return { message: 'Added to wishlist' };
  }

  async removeFromWishlist(studentId: string, courseId: number) {
    const { count } = await this.prisma.wishlist.deleteMany({
      where: { studentId, courseId },
    });

    if (count === 0) {
      throw new NotFoundException('This course is not in your wishlist');
    }

    return { message: 'Removed from wishlist' };
  }
}
