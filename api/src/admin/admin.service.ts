import {
  addDays,
  bangkokDateKey,
  bangkokDateRange,
  startOfBangkokDay,
} from '@/common/utils/bangkok-date';
import { PrismaService } from '@/database/prisma.service';
import { FindUsersDto } from '@/admin/dto/find-users.dto';
import { FindAdminCoursesDto } from '@/admin/dto/find-admin-courses.dto';
import { FindPaymentsDto } from '@/admin/dto/find-payments.dto';
import {
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
  RefundRequestStatus,
  Role,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { Prisma } from '@/database/generated/prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '@/infrastructure/mail/mail.service';
import { FindRefundRequestsDto } from '@/admin/dto/find-refund-requests.dto';
import { RejectRefundRequestDto } from '@/admin/dto/reject-refund-request.dto';
import { OpnService } from '@/infrastructure/payment/opn.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { RefundPurchaseDto } from '@/admin/dto/refund-purchase.dto';
import { CreateAdminDto } from '@/admin/dto/create-admin.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictException } from '@nestjs/common';
import { pageQuery, paginated } from '@/common/utils/pagination';

/** บาท → สตางค์ (หน่วยที่ Opn ใช้) */
const toSatang = (amount: Prisma.Decimal) => amount.mul(100).round().toNumber();

/** จำนวนวันของกราฟรายได้บน dashboard */
const DAILY_REVENUE_DAYS = 30;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly opnService: OpnService,
    private readonly mailService: MailService,
  ) {}

  async getAdminDashboard() {
    const today = bangkokDateKey();
    const monthStart = startOfBangkokDay(`${today.slice(0, 7)}-01`);
    // กราฟ 30 วันรวมวันนี้
    const chartStartKey = addDays(today, -(DAILY_REVENUE_DAYS - 1));
    const success = { paymentStatus: PaymentStatus.SUCCESS };

    const [
      totalUsers,
      usersThisMonth,
      totalCourses,
      publishedCourses,
      revenueAll,
      revenueThisMonth,
      chartPurchases,
      recentPayments,
    ] = await Promise.all([
      // ผู้ใช้ทั่วไปทุกคน (ผู้สอนก็มี role STUDENT) ไม่นับบัญชีแอดมิน
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({
        where: { role: Role.STUDENT, createdAt: { gte: monthStart } },
      }),
      this.prisma.course.count({
        where: { status: { not: StatusCourse.DELETED } },
      }),
      this.prisma.course.count({
        where: { status: StatusCourse.PUBLISHED },
      }),
      this.prisma.purchase.aggregate({
        where: success,
        _sum: { total: true, refundedAmount: true },
        _count: true,
      }),
      this.prisma.purchase.aggregate({
        where: { ...success, createdAt: { gte: monthStart } },
        _sum: { total: true, refundedAmount: true },
      }),
      this.prisma.purchase.findMany({
        where: {
          ...success,
          createdAt: { gte: startOfBangkokDay(chartStartKey) },
        },
        select: {
          total: true,
          refundedAmount: true,
          purchasedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.purchase.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          total: true,
          paymentStatus: true,
          createdAt: true,
          student: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // รวมยอดรายวันใน JS แทน GROUP BY ใน SQL เพราะต้องตัดวันตามเวลาไทย
    // ข้อมูลแค่ 30 วันของรายการที่สำเร็จ จึงไม่หนัก
    const daily = new Map<string, { total: number; count: number }>();
    for (let i = 0; i < DAILY_REVENUE_DAYS; i++) {
      daily.set(addDays(chartStartKey, i), { total: 0, count: 0 });
    }
    for (const purchase of chartPurchases) {
      const day = daily.get(
        bangkokDateKey(purchase.purchasedAt ?? purchase.createdAt),
      );
      if (!day) continue;
      // คืนเงินบางคอร์สไปแล้ว ไม่นับเป็นรายได้
      day.total += Number(purchase.total.sub(purchase.refundedAmount));
      day.count += 1;
    }

    const toAmount = (value: Prisma.Decimal | null) =>
      (value ?? new Prisma.Decimal(0)).toString();
    // รายได้สุทธิ = ยอดจ่าย - ยอดที่คืนบางคอร์สไปแล้ว (คืนทั้งออเดอร์ไม่อยู่ใน SUCCESS อยู่แล้ว)
    const netAmount = (sum: {
      total: Prisma.Decimal | null;
      refundedAmount: Prisma.Decimal | null;
    }) =>
      toAmount(
        (sum.total ?? new Prisma.Decimal(0)).sub(
          sum.refundedAmount ?? new Prisma.Decimal(0),
        ),
      );

    return {
      totalUsers,
      usersThisMonth,
      totalCourses,
      publishedCourses,
      successfulPayments: revenueAll._count,
      totalRevenue: netAmount(revenueAll._sum),
      revenueThisMonth: netAmount(revenueThisMonth._sum),
      dailyRevenue: [...daily].map(([date, day]) => ({ date, ...day })),
      recentPayments,
    };
  }

  async findUsers(dto: FindUsersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const where: Prisma.UserWhereInput = {
      role: Role.STUDENT,
      // บัญชีที่ผู้ใช้ลบเองไม่ต้องโชว์ (เหลือแถวไว้แค่ผูกกับประวัติการซื้อ)
      deletedAt: null,
      ...(dto.isInstructor !== undefined && { isInstructor: dto.isInstructor }),
      ...(dto.search && {
        OR: [
          { firstName: { contains: dto.search, mode: 'insensitive' } },
          { lastName: { contains: dto.search, mode: 'insensitive' } },
          { email: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageQuery(page, limit),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isInstructor: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async updateUserStatus(adminId: string, userId: string) {
    if (adminId === userId) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Use the admin account endpoints to manage admin users',
      );
    }
    if (user.deletedAt) {
      throw new BadRequestException('This account was deleted by its owner');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: !user.status },
      select: { id: true, status: true },
    });
  }

  async findAllCourses(dto: FindAdminCoursesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const where: Prisma.CourseWhereInput = {
      status: dto.status,
      ...(dto.search && {
        title: { contains: dto.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageQuery(page, limit),
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          createdAt: true,
          instructor: { select: { firstName: true, lastName: true } },
          _count: {
            select: {
              purchaseItems: {
                where: {
                  purchase: { paymentStatus: PaymentStatus.SUCCESS },
                  enrollmentStatus: { not: EnrollmentStatus.REFUNDED },
                },
              },
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async updateCourseStatus(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (course.status === StatusCourse.PUBLISHED) {
      return this.prisma.course.update({
        where: { id: courseId },
        data: { status: StatusCourse.SUSPENDED },
        select: { id: true, status: true },
      });
    }
    if (course.status === StatusCourse.SUSPENDED) {
      return this.prisma.course.update({
        where: { id: courseId },
        data: { status: StatusCourse.PUBLISHED },
        select: { id: true, status: true },
      });
    }

    throw new BadRequestException(
      'Only published or suspended courses can be toggled here',
    );
  }

  async findPayments(dto: FindPaymentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const where: Prisma.PurchaseWhereInput = {
      paymentStatus: dto.status,
      createdAt: bangkokDateRange(dto.from, dto.to),
      ...(dto.refundNeeded && { manualRefundNeeded: true }),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageQuery(page, limit),
        select: {
          id: true,
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          manualRefundNeeded: true,
          refundReference: true,
          refundedAmount: true,
          purchasedAt: true,
          createdAt: true,
          refundRequests: { select: { status: true } },
          student: { select: { firstName: true, lastName: true, email: true } },
          purchaseItems: { select: { course: { select: { title: true } } } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  /**
   * คำขอคืนเงินจากนักเรียน (ทีละคอร์ส) พร้อมข้อมูลช่วยตัดสินใจ: ช่องทางที่จ่าย
   * และเรียนคอร์สนั้นไปแล้วกี่บท (เรียนเกือบจบแล้วมาขอคืน ควรพิจารณาให้ดี)
   */
  async findRefundRequests(dto: FindRefundRequestsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const where: Prisma.RefundRequestWhereInput = { status: dto.status };

    const [requests, total, pendingCount] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        // รอพิจารณาขึ้นก่อน (enum เรียง PENDING ก่อน) แล้วใหม่สุดก่อน
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        ...pageQuery(page, limit),
        select: {
          id: true,
          reason: true,
          status: true,
          adminNote: true,
          refundReference: true,
          createdAt: true,
          reviewedAt: true,
          reviewedBy: { select: { firstName: true, lastName: true } },
          student: { select: { firstName: true, lastName: true, email: true } },
          purchaseItem: {
            select: {
              price: true,
              enrollmentStatus: true,
              course: {
                select: {
                  title: true,
                  _count: { select: { lessons: true } },
                },
              },
              _count: {
                select: {
                  lessonProgresses: { where: { isCompleted: true } },
                },
              },
            },
          },
          purchase: {
            select: {
              id: true,
              total: true,
              paymentMethod: true,
              paymentStatus: true,
              purchasedAt: true,
              _count: { select: { purchaseItems: true } },
            },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
      this.prisma.refundRequest.count({
        where: { status: RefundRequestStatus.PENDING },
      }),
    ]);

    const items = requests.map(({ purchaseItem, purchase, ...request }) => ({
      ...request,
      course: {
        title: purchaseItem.course.title,
        price: purchaseItem.price,
        enrollmentStatus: purchaseItem.enrollmentStatus,
        totalLessons: purchaseItem.course._count.lessons,
        completedLessons: purchaseItem._count.lessonProgresses,
      },
      purchase: {
        id: purchase.id,
        total: purchase.total,
        paymentMethod: purchase.paymentMethod,
        paymentStatus: purchase.paymentStatus,
        purchasedAt: purchase.purchasedAt,
        courseCount: purchase._count.purchaseItems,
      },
    }));

    return { ...paginated(items, total, page, limit), pendingCount };
  }

  /** ข้อมูลที่ใช้ตอนพิจารณา และใช้ส่งอีเมลแจ้งผล */
  private async findRefundRequestForReview(requestId: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: requestId },
      select: {
        status: true,
        purchaseItemId: true,
        student: { select: { email: true } },
        purchase: { select: { paymentMethod: true } },
        purchaseItem: {
          select: { price: true, course: { select: { title: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Refund request not found');
    if (request.status !== RefundRequestStatus.PENDING) {
      throw new ConflictException('This request has already been reviewed');
    }
    return request;
  }

  /**
   * อนุมัติ = คืนเงินเฉพาะคอร์สนั้น (ผ่าน Opn หรือบันทึกว่าโอนคืนเองแล้ว) แล้วปิดคำขอ
   * จองคำขอก่อน กันแอดมินสองคนกดพร้อมกัน ถ้าคืนเงินไม่สำเร็จคืนสถานะรอพิจารณา
   */
  async approveRefundRequest(
    adminId: string,
    requestId: string,
    dto: RefundPurchaseDto,
  ) {
    const request = await this.findRefundRequestForReview(requestId);

    const { count } = await this.prisma.refundRequest.updateMany({
      where: { id: requestId, status: RefundRequestStatus.PENDING },
      data: {
        status: RefundRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        refundReference: dto.manual ? dto.reference : null,
      },
    });
    if (count === 0) {
      throw new ConflictException('This request has already been reviewed');
    }

    try {
      await this.refundPurchaseItem(request.purchaseItemId, dto);
    } catch (error) {
      await this.prisma.refundRequest.update({
        where: { id: requestId },
        data: {
          status: RefundRequestStatus.PENDING,
          reviewedById: null,
          reviewedAt: null,
          refundReference: null,
        },
      });
      throw error;
    }

    await this.notifyRefundDecision(request, {
      approved: true,
      manual: dto.manual,
    });
    return { id: requestId, status: RefundRequestStatus.APPROVED };
  }

  async rejectRefundRequest(
    adminId: string,
    requestId: string,
    dto: RejectRefundRequestDto,
  ) {
    const request = await this.findRefundRequestForReview(requestId);

    const { count } = await this.prisma.refundRequest.updateMany({
      where: { id: requestId, status: RefundRequestStatus.PENDING },
      data: {
        status: RefundRequestStatus.REJECTED,
        adminNote: dto.note,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (count === 0) {
      throw new ConflictException('This request has already been reviewed');
    }

    await this.notifyRefundDecision(request, {
      approved: false,
      note: dto.note,
    });
    return { id: requestId, status: RefundRequestStatus.REJECTED };
  }

  /** เมลไม่ออกไม่ควรทำให้การพิจารณาล้มเหลว ผลบันทึกแล้ว นักเรียนดูในเว็บได้ */
  private async notifyRefundDecision(
    request: Awaited<ReturnType<AdminService['findRefundRequestForReview']>>,
    decision: { approved: boolean; manual?: boolean; note?: string },
  ) {
    try {
      await this.mailService.sendRefundDecision(request.student.email, {
        ...decision,
        amount: `฿${Number(request.purchaseItem.price).toLocaleString()}`,
        courseTitles: [request.purchaseItem.course.title],
        manual:
          decision.manual ??
          request.purchase.paymentMethod === PaymentMethod.PROMPTPAY,
      });
    } catch (error) {
      this.logger.error('Cannot send refund decision email', error);
    }
  }

  /**
   * charge ของคำสั่งซื้อจาก Opn เพื่อคืนเงิน null = ไม่ต้องเรียก Opn
   * (คืนเองนอกระบบ หรือไม่มี charge เช่นคอร์สฟรี/ข้อมูลก่อนย้ายมา Opn)
   */
  private async chargeForRefund(
    chargeId: string | null,
    dto: RefundPurchaseDto,
  ) {
    if (!chargeId || dto.manual) return null;

    const charge = await this.opnService.getCharge(chargeId);
    if (!charge.refundable) {
      throw new BadRequestException({
        message:
          "This payment method can't be refunded automatically. Transfer the money back yourself, then mark it as refunded.",
        code: 'REFUND_NOT_SUPPORTED',
      });
    }
    return charge;
  }

  /**
   * คืนเงินคอร์สเดียวในคำสั่งซื้อ (คืนบางส่วนของ charge เท่าราคาคอร์สนั้น)
   * คืนครบทุกคอร์สแล้ว คำสั่งซื้อจะเปลี่ยนเป็น REFUNDED เอง
   */
  async refundPurchaseItem(purchaseItemId: string, dto: RefundPurchaseDto) {
    const item = await this.prisma.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      select: {
        price: true,
        enrollmentStatus: true,
        purchaseId: true,
        purchase: {
          select: { chargeId: true, paymentStatus: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Purchase not found');
    if (
      item.purchase.paymentStatus !== PaymentStatus.SUCCESS ||
      item.enrollmentStatus === EnrollmentStatus.REFUNDED
    ) {
      throw new BadRequestException('This course has already been refunded');
    }

    const charge = await this.chargeForRefund(item.purchase.chargeId, dto);

    // จองก่อนเรียก Opn: กดซ้ำ/สองแท็บพร้อมกันจะผ่านได้คำขอเดียว
    const { count } = await this.prisma.purchaseItem.updateMany({
      where: {
        id: purchaseItemId,
        enrollmentStatus: { not: EnrollmentStatus.REFUNDED },
      },
      data: { enrollmentStatus: EnrollmentStatus.REFUNDED },
    });
    if (count === 0) {
      throw new BadRequestException('This course has already been refunded');
    }

    if (charge) {
      // ไม่คืนเกินยอดที่ยังเหลือใน charge (อาจเคยคืนจากแดชบอร์ด Opn มาก่อน)
      const remaining = charge.amount - (charge.refunded_amount ?? 0);
      const amount = Math.min(toSatang(item.price), remaining);
      try {
        if (amount > 0) await this.opnService.refund(charge.id, amount);
      } catch (error) {
        await this.prisma.purchaseItem.update({
          where: { id: purchaseItemId },
          data: { enrollmentStatus: item.enrollmentStatus },
        });
        throw error;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id: item.purchaseId },
        data: { refundedAmount: { increment: item.price } },
        select: { total: true, refundedAmount: true },
      });
      // คืนครบทุกคอร์ส = คืนทั้งออเดอร์
      if (purchase.refundedAmount.gte(purchase.total)) {
        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }
    });

    return { id: purchaseItemId, enrollmentStatus: EnrollmentStatus.REFUNDED };
  }

  /**
   * คืนเงินทั้งคำสั่งซื้อ (หน้า Payments ใช้กับรายการที่ระบบพบว่าจ่ายซ้ำ)
   * - ปกติ: คืนผ่าน Opn อัตโนมัติ (บัตร และช่องทางที่ Opn คืนให้ได้)
   * - manual: ช่องทางที่คืนผ่าน Opn ไม่ได้ (พร้อมเพย์) แอดมินโอนคืนเองแล้วกรอกเลขอ้างอิง
   *   ระบบแค่บันทึก ถ้ากดแบบปกติกับช่องทางแบบนี้จะได้ code REFUND_NOT_SUPPORTED กลับไป
   */
  async refundPurchase(purchaseId: string, dto: RefundPurchaseDto) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { total: true, chargeId: true, paymentStatus: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.paymentStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful purchases can be refunded',
      );
    }

    // ถามก่อนจอง: ช่องทางนี้คืนผ่าน Opn ได้ไหม และคืนไปแล้วเท่าไร
    const charge = await this.chargeForRefund(purchase.chargeId, dto);

    // จองสถานะก่อนเรียก Opn: กด Refund ซ้ำ/สองแท็บพร้อมกันจะผ่านได้คำขอเดียว
    const { count } = await this.prisma.purchase.updateMany({
      where: { id: purchaseId, paymentStatus: PaymentStatus.SUCCESS },
      data: {
        paymentStatus: PaymentStatus.REFUNDED,
        manualRefundNeeded: false,
        refundReference: dto.manual ? dto.reference : null,
      },
    });
    if (count === 0) {
      throw new BadRequestException(
        'Only successful purchases can be refunded',
      );
    }

    // คืนส่วนที่เหลือ (อาจเคยคืนบางคอร์ส หรือคืนจากแดชบอร์ด Opn มาก่อน)
    // Opn ปฏิเสธ (เช่นเกินระยะเวลาคืนเงิน) คืนสถานะเดิมแล้วส่ง error กลับไป
    if (charge) {
      const remaining = charge.amount - (charge.refunded_amount ?? 0);
      try {
        if (remaining > 0) await this.opnService.refund(charge.id, remaining);
      } catch (error) {
        await this.prisma.purchase.update({
          where: { id: purchaseId },
          data: { paymentStatus: PaymentStatus.SUCCESS },
        });
        throw error;
      }
    }

    await this.prisma.$transaction([
      this.prisma.purchase.update({
        where: { id: purchaseId },
        data: { refundedAmount: purchase.total },
      }),
      this.prisma.purchaseItem.updateMany({
        where: { purchaseId },
        data: { enrollmentStatus: EnrollmentStatus.REFUNDED },
      }),
      // คำขอคืนเงินรายคอร์สที่ยังค้าง ถือว่าได้คืนไปพร้อมกันแล้ว
      this.prisma.refundRequest.updateMany({
        where: { purchaseId, status: RefundRequestStatus.PENDING },
        data: {
          status: RefundRequestStatus.APPROVED,
          adminNote: 'Refunded together with the whole order.',
          reviewedAt: new Date(),
        },
      }),
    ]);
    return { id: purchaseId, paymentStatus: PaymentStatus.REFUNDED };
  }

  /**
   * Super Admin อยู่บนสุดเสมอ ที่เหลือเรียงตามลำดับการสร้างบัญชี (เก่าก่อน)
   * ตำแหน่งในตารางจึงไม่เปลี่ยนเมื่อมีแอดมินใหม่ เรียงใน JS เพราะ Postgres
   * เรียง enum ตามลำดับที่ประกาศ ซึ่งไม่ควรผูกความหมายไว้กับลำดับนั้น
   */
  async findAdmins(search?: string) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const rank = (role: Role) => (role === Role.SUPER_ADMIN ? 0 : 1);
    // sort ของ JS คงลำดับเดิมเมื่อค่าเท่ากัน ลำดับวันที่จาก DB จึงไม่เสีย
    return admins.sort((a, b) => rank(a.role) - rank(b.role));
  }

  async createAdmin(dto: CreateAdminDto) {
    const hashed = await this.bcryptService.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashed,
          role: Role.ADMIN,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async updateAdminStatus(adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new NotFoundException('Admin account not found');
    }

    return this.prisma.user.update({
      where: { id: adminId },
      data: { status: !admin.status },
      select: { id: true, status: true },
    });
  }
}
