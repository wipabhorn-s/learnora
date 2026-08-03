import { AddToCartDto } from '@/cart/dto/add-to-cart.dto';
import { Prisma } from '@/database/generated/prisma/client';
import {
  EnrollmentStatus,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
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
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async findCart(studentId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        course: { select: COURSE_SELECT },
      },
    });

    const items = cartItems.map((item) => ({
      ...item,
      isAvailable: item.course.status === StatusCourse.PUBLISHED,
    }));

    const total = items
      .filter((item) => item.isAvailable)
      .reduce((sum, item) => sum.add(item.course.price), new Prisma.Decimal(0));

    return { items, total };
  }

  async addToCart(studentId: string, dto: AddToCartDto) {
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
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (activeEnrollment) {
      throw new ConflictException('You already own this course');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: dto.courseId },
      },
    });

    if (existing) {
      throw new ConflictException('This course is already in your cart');
    }

    await this.prisma.cartItem.create({
      data: { studentId, courseId: dto.courseId },
    });

    return { message: 'Added to cart' };
  }

  async removeFromCart(studentId: string, courseId: number) {
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { studentId, courseId },
    });

    if (count === 0) {
      throw new NotFoundException('This course is not in your cart');
    }

    return { message: 'Removed from cart' };
  }
}
