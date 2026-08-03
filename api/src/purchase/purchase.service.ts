import { Prisma } from '@/database/generated/prisma/client';
import {
  AccessType,
  EnrollmentStatus,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { StripeService } from '@/infrastructure/payment/stripe.service';
import { CheckoutDto } from '@/purchase/dto/checkout.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const PURCHASE_ITEM_SELECT = {
  id: true,
  price: true,
  expiresAt: true,
  enrollmentStatus: true,
  course: {
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      instructor: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async checkout(studentId: string, dto: CheckoutDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { studentId },
      include: { course: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const unavailable = cartItems.find(
      (item) => item.course.status !== StatusCourse.PUBLISHED,
    );
    if (unavailable) {
      throw new BadRequestException(
        `"${unavailable.course.title}" is no longer available`,
      );
    }

    const courseIds = cartItems.map((item) => item.courseId);
    const activeEnrollment = await this.prisma.purchaseItem.findFirst({
      where: {
        studentId,
        courseId: { in: courseIds },
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      include: { course: { select: { title: true } } },
    });
    if (activeEnrollment) {
      throw new BadRequestException(
        `You already own "${activeEnrollment.course.title}"`,
      );
    }

    const total = cartItems.reduce(
      (sum, item) => sum.add(item.course.price),
      new Prisma.Decimal(0),
    );

    if (total.greaterThan(0) && !dto.paymentMethodId) {
      throw new BadRequestException('Payment method is required');
    }

    const isPaid = total.equals(0)
      ? true
      : await this.stripeService.charge(total.toNumber(), dto.paymentMethodId!);

    const paymentStatus = isPaid ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          studentId,
          total,
          paymentStatus,
          purchasedAt:
            paymentStatus === PaymentStatus.SUCCESS ? new Date() : null,
          purchaseItems: {
            create: cartItems.map((item) => ({
              courseId: item.courseId,
              studentId,
              price: item.course.price,
              expiresAt:
                item.course.accessType === AccessType.LIMITED
                  ? new Date(
                      Date.now() +
                        (item.course.accessDuration ?? 0) * 24 * 60 * 60 * 1000,
                    )
                  : null,
              enrollmentStatus:
                paymentStatus === PaymentStatus.SUCCESS
                  ? EnrollmentStatus.ACTIVE
                  : EnrollmentStatus.EXPIRED,
            })),
          },
        },
        include: { purchaseItems: { select: PURCHASE_ITEM_SELECT } },
      });

      if (paymentStatus === PaymentStatus.SUCCESS) {
        await Promise.all([
          tx.cartItem.deleteMany({
            where: { studentId, courseId: { in: courseIds } },
          }),
          tx.wishlist.deleteMany({
            where: { studentId, courseId: { in: courseIds } },
          }),
        ]);
      }

      return created;
    });

    if (paymentStatus === PaymentStatus.FAILED) {
      throw new BadRequestException({
        message: 'Payment failed. Please try again with a different card.',
        purchaseId: purchase.id,
      });
    }

    return purchase;
  }

  findPurchases(studentId: string) {
    return this.prisma.purchase.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        paymentStatus: true,
        purchasedAt: true,
        createdAt: true,
        purchaseItems: { select: PURCHASE_ITEM_SELECT },
      },
    });
  }

  async findPurchase(studentId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        studentId: true,
        total: true,
        paymentStatus: true,
        purchasedAt: true,
        createdAt: true,
        purchaseItems: { select: PURCHASE_ITEM_SELECT },
      },
    });

    if (!purchase || purchase.studentId !== studentId) {
      throw new NotFoundException('Purchase not found');
    }

    return purchase;
  }
}
