import { EnvVariable } from '@/config/env.validation';
import { Prisma } from '@/database/generated/prisma/client';
import {
  AccessType,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { OpnCharge, OpnService } from '@/infrastructure/payment/opn.service';
import { CheckoutDto } from '@/purchase/dto/checkout.dto';
import { RequestRefundDto } from '@/purchase/dto/request-refund.dto';
import { REFUND_WINDOW_DAYS, refundDeadline } from '@/purchase/refund-policy';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** สถานะคำขอคืนเงินที่นักเรียนเห็นในประวัติการซื้อ */
const REFUND_REQUEST_SELECT = {
  status: true,
  adminNote: true,
  createdAt: true,
  reviewedAt: true,
} as const;

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
  refundRequest: { select: REFUND_REQUEST_SELECT },
} as const;

/** Opn เก็บเงินขั้นต่ำ ฿20 (หน่วยสตางค์) */
const MIN_CHARGE_SATANG = 2000;
/** เพดานต่อครั้งของ TrueMoney ที่ Opn รับ ฿100,000 (หน่วยสตางค์) */
const TRUEMONEY_MAX_SATANG = 10_000_000;
/** QR พร้อมเพย์อายุสั้น (ค่าเริ่มต้นของ Opn 24 ชม.) ช่วงที่ QR เก่าเผลอถูกจ่ายจะได้แคบ */
const PROMPTPAY_EXPIRES_MS = 10 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** ช่วงที่คำขอเก็บเงินกำลังส่งไป Opn (ยังไม่ได้ chargeId) ห้ามเริ่มรายการใหม่ซ้อน */
const IN_FLIGHT_MS = MINUTE_MS;
/** รายการที่ยกเลิกไปแล้ว ยังอาจถูกจ่ายได้ในช่วงนี้ (หน้าธนาคาร/3-D Secure ค้างไว้) */
const LATE_PAYMENT_WINDOW_MS = DAY_MS;
/** เรียก Opn ไม่สำเร็จกลางทางจนไม่มี chargeId นานเท่านี้ = ถือว่าล้มเหลว */
const ORPHAN_AFTER_MS = 10 * MINUTE_MS;

const CANCELLED_MESSAGE =
  'This payment was cancelled because you started a new one.';

const toSatang = (amount: Prisma.Decimal) => amount.mul(100).round().toNumber();

const isPaid = (charge: OpnCharge) =>
  charge.status === 'successful' && charge.paid;

const isClosedUnpaid = (charge: OpnCharge) =>
  ['failed', 'expired', 'reversed'].includes(charge.status);

export type PaymentProgress = {
  purchaseId: string;
  status: PaymentStatus;
  /** หน้าของธนาคาร/TrueMoney/3-D Secure ที่ต้องพาผู้ใช้ไป */
  authorizeUri: string | null;
  /** รูป QR พร้อมเพย์ (URL สาธารณะที่มีโทเค็นในตัว) */
  qrCodeUrl: string | null;
  expiresAt: string | null;
  failureMessage: string | null;
};

/**
 * การจ่ายเงินผ่าน Opn ส่วนใหญ่ "รอผล" (QR, แอปธนาคาร, 3-D Secure)
 * คำสั่งซื้อจึงเริ่มที่ PENDING แล้วค่อยเปลี่ยนเมื่อถามสถานะจาก Opn
 * จาก 3 ทาง: หน้าเว็บที่คอยเช็ก, webhook และรอบตรวจทานอัตโนมัติ (reconcile)
 *
 * สถานะทุกครั้งมาจากการถาม Opn เอง ไม่เชื่อค่าที่หน้าเว็บหรือ body webhook ส่งมา
 * และทุกขั้นเรียกซ้ำได้โดยผลไม่เปลี่ยน (เปิดคอร์ส/คืนเงินไม่ซ้ำ)
 */
@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly opnService: OpnService,
    configService: ConfigService<EnvVariable, true>,
  ) {
    this.frontendUrl = configService.get('FRONTEND_URL', { infer: true });
  }

  async checkout(
    studentId: string,
    dto: CheckoutDto,
  ): Promise<PaymentProgress> {
    // รายการที่รออยู่อาจจ่ายเสร็จไปแล้ว (เช่นสแกน QR แล้วกดกลับมาหน้านี้)
    // ถามก่อน ถ้าจ่ายแล้วคอร์สจะเป็นของผู้ใช้ และถูกกันด้วยเช็กด้านล่าง
    await this.settleStudentPending(studentId);

    const cartItems = await this.prisma.cartItem.findMany({
      where: { studentId },
      include: { course: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // ใส่ตะกร้าไว้ก่อนเปิดสิทธิ์สอน หรือก่อน API กันไว้ ก็ต้องจ่ายไม่ได้
    const ownCourse = cartItems.find(
      (item) => item.course.instructorId === studentId,
    );
    if (ownCourse) {
      throw new BadRequestException(
        `"${ownCourse.course.title}" is your own course. Remove it from your cart.`,
      );
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
    const amount = toSatang(total);

    if (amount > 0) {
      if (!dto.method || dto.method === PaymentMethod.FREE) {
        throw new BadRequestException('Choose a payment method');
      }
      if (amount < MIN_CHARGE_SATANG) {
        throw new BadRequestException('The minimum payment is ฿20');
      }
      if (
        dto.method === PaymentMethod.TRUEMONEY &&
        amount > TRUEMONEY_MAX_SATANG
      ) {
        throw new BadRequestException(
          'TrueMoney accepts up to ฿100,000 per payment. Choose another method.',
        );
      }
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      // ล็อกต่อผู้ใช้จนจบ transaction: กดจ่ายสองแท็บพร้อมกันจะเข้าคิวทีละคำขอ
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${studentId}))`;

      const inFlight = await tx.purchase.findFirst({
        where: {
          studentId,
          paymentStatus: PaymentStatus.PENDING,
          chargeId: null,
          createdAt: { gte: new Date(Date.now() - IN_FLIGHT_MS) },
        },
        select: { id: true },
      });
      if (inFlight) {
        throw new ConflictException(
          'A payment is already being processed. Please wait a moment.',
        );
      }

      // มีรายการรอจ่ายอยู่ (เช่น QR ที่ยังไม่หมดอายุ) ต้องให้ผู้ใช้ยืนยันก่อนว่าจะยกเลิก
      // หน้าเว็บจะพากลับไปหน้าจ่ายเดิม หรือถามยืนยันแล้วส่ง replacePending มา
      const waiting = await tx.purchase.findFirst({
        where: {
          studentId,
          paymentStatus: PaymentStatus.PENDING,
          chargeId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (waiting && !dto.replacePending) {
        throw new ConflictException({
          message: 'You have a payment waiting to be completed.',
          code: 'PAYMENT_PENDING',
          purchaseId: waiting.id,
        });
      }

      // ยกเลิกรายการเดิมที่ยังรอจ่าย กันเก็บเงินซ้ำสองรอบ
      await this.cancelStudentPending(tx, studentId);

      return tx.purchase.create({
        data: {
          studentId,
          total,
          paymentMethod: amount === 0 ? PaymentMethod.FREE : dto.method,
          purchaseItems: {
            // ยังไม่ให้สิทธิ์เรียนจนกว่า purchase จะเป็น SUCCESS (ทุกที่เช็กคู่กัน)
            // วันหมดอายุของคอร์สแบบจำกัดเวลาตั้งตอนจ่ายสำเร็จใน finalize
            create: cartItems.map((item) => ({
              courseId: item.courseId,
              studentId,
              price: item.course.price,
            })),
          },
        },
        select: { id: true },
      });
    });

    if (amount === 0) {
      await this.finalize(purchase.id);
      return this.progress(purchase.id, PaymentStatus.SUCCESS);
    }

    let charge: OpnCharge;
    try {
      charge = await this.opnService.createCharge({
        amount,
        // ทุกช่องทางกลับมาที่หน้าเดียวกัน หน้านั้นถามสถานะแล้วพาไปต่อเอง
        returnUri: `${this.frontendUrl}/checkout/pending?purchaseId=${purchase.id}`,
        metadata: { purchase_id: purchase.id, student_id: studentId },
        description: `Learnora purchase ${purchase.id}`,
        ...this.chargeSource(dto),
      });
    } catch (error) {
      await this.markFailed(purchase.id);
      throw error;
    }

    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { chargeId: charge.id },
    });

    const status = await this.applyCharge(purchase.id, charge);
    return this.progress(purchase.id, status, charge);
  }

  /**
   * คอร์สฟรี: กด "Enroll for free" แล้วได้คอร์สทันที ไม่ต้องผ่านตะกร้า/checkout
   * กดซ้ำ (หรือสองแท็บพร้อมกัน) ได้ผลเดิม ไม่สร้างคำสั่งซื้อซ้อน
   */
  async enrollFree(studentId: string, courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { status: true, price: true, instructorId: true },
    });

    if (!course || course.status !== StatusCourse.PUBLISHED) {
      throw new NotFoundException('Course not found');
    }
    if (course.instructorId === studentId) {
      throw new BadRequestException("You can't enroll in your own course");
    }
    if (!course.price.equals(0)) {
      throw new BadRequestException('This course is not free');
    }

    const purchaseId = await this.prisma.$transaction(async (tx) => {
      // ล็อกต่อผู้ใช้เหมือน checkout: กดสองครั้งติดกันจะเข้าคิว ครั้งที่สองเจอว่ามีแล้ว
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${studentId}))`;

      // คอร์สแบบจำกัดเวลาที่หมดอายุแล้ว ลงทะเบียนใหม่ได้
      const active = await tx.purchaseItem.findFirst({
        where: {
          studentId,
          courseId,
          enrollmentStatus: EnrollmentStatus.ACTIVE,
          purchase: { paymentStatus: PaymentStatus.SUCCESS },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { purchaseId: true },
      });
      if (active) return null;

      const purchase = await tx.purchase.create({
        data: {
          studentId,
          total: 0,
          paymentMethod: PaymentMethod.FREE,
          purchaseItems: { create: { courseId, studentId, price: 0 } },
        },
        select: { id: true },
      });
      return purchase.id;
    });

    if (purchaseId) await this.finalize(purchaseId);
    return { courseId, enrolled: true };
  }

  /** หน้ารอผลเรียกซ้ำเป็นระยะ ถ้ายังค้างอยู่ก็ถาม Opn ให้ทุกครั้ง */
  async getPaymentProgress(
    studentId: string,
    purchaseId: string,
  ): Promise<PaymentProgress> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        studentId: true,
        paymentStatus: true,
        chargeId: true,
        cancelledAt: true,
      },
    });

    if (!purchase || purchase.studentId !== studentId) {
      throw new NotFoundException('Purchase not found');
    }

    if (
      purchase.paymentStatus !== PaymentStatus.PENDING ||
      !purchase.chargeId
    ) {
      return this.progress(purchaseId, purchase.paymentStatus, undefined, {
        cancelled: Boolean(purchase.cancelledAt),
      });
    }

    const charge = await this.opnService.getCharge(purchase.chargeId);
    const status = await this.applyCharge(purchaseId, charge);
    return this.progress(purchaseId, status, charge);
  }

  /**
   * webhook charge.complete ของ Opn ใช้กรณีผู้ใช้ปิดหน้าเว็บก่อนกลับมา
   * อ่านแค่ id จาก body แล้วไปถามสถานะจริงจาก Opn เอง
   */
  async handleChargeComplete(chargeId: string) {
    const charge = await this.opnService.getCharge(chargeId);

    const purchase = await this.prisma.purchase.findUnique({
      where: { chargeId },
      select: { id: true },
    });
    if (purchase) {
      await this.applyCharge(purchase.id, charge);
      return;
    }

    // เน็ตหลุดตอนสร้าง charge: Opn สร้างสำเร็จแต่เราไม่ได้ chargeId กลับมา
    // จึงผูกกลับด้วย purchase_id ใน metadata (charge ที่ได้มาจาก Opn เองแล้ว)
    // ต้องมีทั้งคู่: Prisma ตีความ undefined ว่า "ไม่กรอง" จะไปเจอคำสั่งซื้อของใครก็ได้
    const { purchase_id: purchaseId, student_id: studentId } =
      charge.metadata ?? {};
    if (!purchaseId || !studentId) return;

    const orphan = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, studentId, chargeId: null },
      select: { id: true, paymentStatus: true },
    });
    if (!orphan) return;

    await this.prisma.purchase.update({
      where: { id: orphan.id },
      data: {
        chargeId,
        // ระบบถือว่ารายการนี้ล้มเหลวไปแล้ว ถ้าเงินเข้ามาจริงต้องคืนอัตโนมัติ
        ...(orphan.paymentStatus === PaymentStatus.FAILED && {
          cancelledAt: new Date(),
        }),
      },
    });
    await this.applyCharge(orphan.id, charge);
  }

  /**
   * รอบตรวจทาน (PaymentReconcileService เรียกเป็นระยะ) ปิดช่องโหว่ที่ webhook
   * มาไม่ถึง เช่น รันในเครื่อง, server ล่มตอน Opn ส่งมา, ผู้ใช้ปิดหน้าเว็บ
   */
  async reconcile() {
    const now = Date.now();

    const [stalePending, cancelledOpen] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          paymentStatus: PaymentStatus.PENDING,
          chargeId: { not: null },
          createdAt: { lt: new Date(now - MINUTE_MS) },
        },
        select: { id: true, chargeId: true },
        take: 50,
      }),
      // ยกเลิกไปแล้วแต่ charge ที่ Opn อาจยังถูกจ่ายได้ ต้องเฝ้าไว้คืนเงิน
      this.prisma.purchase.findMany({
        where: {
          paymentStatus: PaymentStatus.FAILED,
          chargeId: { not: null },
          cancelledAt: { gte: new Date(now - LATE_PAYMENT_WINDOW_MS) },
        },
        select: { id: true, chargeId: true },
        take: 50,
      }),
    ]);

    for (const purchase of [...stalePending, ...cancelledOpen]) {
      await this.syncCharge(purchase.id, purchase.chargeId!);
    }

    // เรียก Opn ไม่สำเร็จ/server ล่มกลางทาง: ไม่มี chargeId ก็ไม่มีอะไรให้จ่ายแล้ว
    const orphans = await this.prisma.purchase.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        chargeId: null,
        createdAt: { lt: new Date(now - ORPHAN_AFTER_MS) },
      },
      select: { id: true },
      take: 50,
    });
    for (const orphan of orphans) await this.markFailed(orphan.id);
  }

  private async settleStudentPending(studentId: string) {
    const pending = await this.prisma.purchase.findMany({
      where: {
        studentId,
        paymentStatus: PaymentStatus.PENDING,
        chargeId: { not: null },
      },
      select: { id: true, chargeId: true },
    });

    for (const purchase of pending) {
      await this.syncCharge(purchase.id, purchase.chargeId!);
    }
  }

  /**
   * ถาม Opn แล้วอัปเดตคำสั่งซื้อ ผิดพลาดไม่ throw (รอบถัดไปลองใหม่)
   * ยกเว้น Opn บอกว่าไม่มี charge นี้ (เช่นเปลี่ยนจาก test key เป็น live key)
   * ถือว่าจ่ายไม่ได้แล้ว ไม่งั้นจะค้างและถูกถามซ้ำไปตลอด
   */
  private async syncCharge(purchaseId: string, chargeId: string) {
    try {
      const charge = await this.opnService.getCharge(chargeId);
      await this.applyCharge(purchaseId, charge);
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        (error.getResponse() as { code?: string }).code === 'OPN_NOT_FOUND'
      ) {
        await this.markFailed(purchaseId);
        await this.prisma.purchase.update({
          where: { id: purchaseId },
          data: { cancelledAt: null },
        });
        return;
      }
      this.logger.error(`Cannot sync purchase ${purchaseId}`, error);
    }
  }

  /**
   * ยกเลิกในระบบเราเท่านั้น Opn ไม่มีทางยกเลิก QR พร้อมเพย์/หน้าธนาคารที่เปิดค้างไว้
   * จึงจด cancelledAt ไว้ ถ้าจ่ายเข้ามาทีหลัง applyCharge จะคืนเงินให้อัตโนมัติ
   */
  private async cancelStudentPending(
    tx: Prisma.TransactionClient,
    studentId: string,
  ) {
    const pending = await tx.purchase.findMany({
      where: { studentId, paymentStatus: PaymentStatus.PENDING },
      select: { id: true },
    });
    if (pending.length === 0) return;

    const ids = pending.map((purchase) => purchase.id);
    await tx.purchase.updateMany({
      where: { id: { in: ids }, paymentStatus: PaymentStatus.PENDING },
      data: { paymentStatus: PaymentStatus.FAILED, cancelledAt: new Date() },
    });
    await tx.purchaseItem.updateMany({
      where: { purchaseId: { in: ids } },
      data: { enrollmentStatus: EnrollmentStatus.EXPIRED },
    });
  }

  private chargeSource(dto: CheckoutDto) {
    switch (dto.method) {
      case PaymentMethod.CARD:
        return { cardToken: dto.cardToken };
      case PaymentMethod.PROMPTPAY:
        return {
          source: { type: 'promptpay' },
          expiresAt: new Date(Date.now() + PROMPTPAY_EXPIRES_MS),
        };
      case PaymentMethod.TRUEMONEY:
        return {
          source: { type: 'truemoney', phone_number: dto.phoneNumber },
        };
      case PaymentMethod.MOBILE_BANKING:
        return { source: { type: `mobile_banking_${dto.bank}` } };
      default:
        throw new BadRequestException('Unsupported payment method');
    }
  }

  /** เปลี่ยนสถานะคำสั่งซื้อตาม charge จาก Opn (เรียกซ้ำได้ ผลเหมือนเดิม) */
  private async applyCharge(
    purchaseId: string,
    charge: OpnCharge,
  ): Promise<PaymentStatus> {
    const purchase = await this.prisma.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      select: { total: true, paymentStatus: true, cancelledAt: true },
    });

    // charge ต้องเป็นของคำสั่งซื้อนี้และยอดตรงเป๊ะ ไม่งั้นไม่แตะอะไรเลย
    if (
      charge.metadata?.purchase_id !== purchaseId ||
      charge.amount !== toSatang(purchase.total) ||
      charge.currency.toLowerCase() !== 'thb'
    ) {
      this.logger.error(
        `Charge ${charge.id} does not match purchase ${purchaseId}`,
      );
      return purchase.paymentStatus;
    }

    if (purchase.paymentStatus === PaymentStatus.PENDING) {
      if (isPaid(charge)) {
        await this.finalize(purchaseId);
        return PaymentStatus.SUCCESS;
      }
      if (isClosedUnpaid(charge)) {
        await this.markFailed(purchaseId);
        return PaymentStatus.FAILED;
      }
      return PaymentStatus.PENDING;
    }

    if (purchase.cancelledAt) {
      if (isPaid(charge)) return this.handleLatePayment(purchaseId, charge);
      // charge ปิดไปแล้วโดยไม่มีใครจ่าย ไม่ต้องเฝ้าต่อ (รอบตรวจทานจะข้ามไป)
      if (isClosedUnpaid(charge)) {
        await this.prisma.purchase.update({
          where: { id: purchaseId },
          data: { cancelledAt: null },
        });
      }
    }

    return purchase.paymentStatus;
  }

  /**
   * ลูกค้าจ่ายรายการที่ระบบยกเลิกไปแล้ว (เช่นสแกน QR เก่า) เงินเข้าแล้วจึงต้องจัดการเสมอ
   * - ยังไม่มีคอร์สในรายการนี้เลย: เปิดคอร์สให้ตามที่จ่าย (สินค้าดิจิทัล ไม่มีต้นทุนเพิ่ม)
   * - มีครบทุกคอร์สแล้ว = จ่ายซ้ำ: คืนเงินอัตโนมัติ ถ้าช่องทางนั้นคืนผ่าน Opn ได้
   * - นอกนั้น (คืนอัตโนมัติไม่ได้ เช่นพร้อมเพย์ หรือมีบางคอร์สแล้ว): เปิดคอร์สที่ยังไม่มี
   *   แล้วติดป้ายให้แอดมินคืนเงินเอง
   */
  private async handleLatePayment(
    purchaseId: string,
    charge: OpnCharge,
  ): Promise<PaymentStatus> {
    const items = await this.prisma.purchaseItem.findMany({
      where: { purchaseId },
      select: { courseId: true, studentId: true },
    });
    // ไม่ควรเกิด แต่กันไว้: studentId เป็น undefined จะกลายเป็น "ไม่กรอง" ใน Prisma
    if (items.length === 0) return PaymentStatus.FAILED;

    const owned = await this.prisma.purchaseItem.findMany({
      where: {
        purchaseId: { not: purchaseId },
        studentId: items[0].studentId,
        courseId: { in: items.map((item) => item.courseId) },
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchase: { paymentStatus: PaymentStatus.SUCCESS },
      },
      select: { courseId: true },
      distinct: ['courseId'],
    });

    if (owned.length === 0) {
      await this.finalize(purchaseId, { fromCancelled: true });
      this.logger.warn(`Late payment honoured on purchase ${purchaseId}`);
      return PaymentStatus.SUCCESS;
    }

    if (owned.length === items.length && charge.refundable) {
      await this.refundLatePayment(purchaseId, charge);
      return PaymentStatus.REFUNDED;
    }

    await this.finalize(purchaseId, {
      fromCancelled: true,
      manualRefundNeeded: true,
    });
    this.logger.warn(`Purchase ${purchaseId} needs a manual refund`);
    return PaymentStatus.SUCCESS;
  }

  /** จ่ายซ้ำของที่มีอยู่แล้ว และช่องทางนั้นคืนผ่าน Opn ได้: คืนเงินส่วนที่ยังไม่คืนทั้งหมด */
  private async refundLatePayment(purchaseId: string, charge: OpnCharge) {
    const remaining = charge.amount - (charge.refunded_amount ?? 0);
    if (remaining > 0) {
      await this.opnService.refund(charge.id, remaining);
      this.logger.warn(
        `Auto-refunded duplicate payment on purchase ${purchaseId} (${charge.id})`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: PaymentStatus.REFUNDED, cancelledAt: null },
      }),
      this.prisma.purchaseItem.updateMany({
        where: { purchaseId },
        data: { enrollmentStatus: EnrollmentStatus.REFUNDED },
      }),
    ]);
  }

  /**
   * จ่ายสำเร็จ: เปิดสิทธิ์เรียน ตั้งวันหมดอายุ ล้างตะกร้า/wishlist
   * fromCancelled = รายการที่ระบบยกเลิกไปแล้วแต่มีเงินเข้ามาทีหลัง (ดู handleLatePayment)
   */
  private finalize(
    purchaseId: string,
    { fromCancelled = false, manualRefundNeeded = false } = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // webhook, หน้าเว็บ และรอบตรวจทานอาจมาพร้อมกัน เปลี่ยนสถานะได้ครั้งเดียว
      const { count } = await tx.purchase.updateMany({
        where: fromCancelled
          ? {
              id: purchaseId,
              paymentStatus: PaymentStatus.FAILED,
              cancelledAt: { not: null },
            }
          : { id: purchaseId, paymentStatus: PaymentStatus.PENDING },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          purchasedAt: now,
          cancelledAt: null,
          manualRefundNeeded,
        },
      });
      if (count === 0) return;

      const purchase = await tx.purchase.findUniqueOrThrow({
        where: { id: purchaseId },
        select: {
          studentId: true,
          purchaseItems: {
            select: {
              id: true,
              courseId: true,
              course: { select: { accessType: true, accessDuration: true } },
            },
          },
        },
      });

      // รายการที่เคยถูกยกเลิก คอร์สถูกตั้งเป็น EXPIRED ไว้ ต้องเปิดกลับ
      await tx.purchaseItem.updateMany({
        where: { purchaseId },
        data: { enrollmentStatus: EnrollmentStatus.ACTIVE },
      });

      await Promise.all(
        purchase.purchaseItems
          .filter((item) => item.course.accessType === AccessType.LIMITED)
          .map((item) =>
            tx.purchaseItem.update({
              where: { id: item.id },
              data: {
                expiresAt: new Date(
                  now.getTime() + (item.course.accessDuration ?? 0) * DAY_MS,
                ),
              },
            }),
          ),
      );

      const where = {
        studentId: purchase.studentId,
        courseId: { in: purchase.purchaseItems.map((item) => item.courseId) },
      };
      await Promise.all([
        tx.cartItem.deleteMany({ where }),
        tx.wishlist.deleteMany({ where }),
      ]);
    });
  }

  private markFailed(purchaseId: string) {
    return this.prisma.$transaction([
      this.prisma.purchase.updateMany({
        where: { id: purchaseId, paymentStatus: PaymentStatus.PENDING },
        data: { paymentStatus: PaymentStatus.FAILED },
      }),
      this.prisma.purchaseItem.updateMany({
        where: {
          purchaseId,
          purchase: { paymentStatus: PaymentStatus.FAILED },
        },
        data: { enrollmentStatus: EnrollmentStatus.EXPIRED },
      }),
    ]);
  }

  private progress(
    purchaseId: string,
    status: PaymentStatus,
    charge?: OpnCharge,
    { cancelled = false } = {},
  ): PaymentProgress {
    const pending = status === PaymentStatus.PENDING;
    return {
      purchaseId,
      status,
      authorizeUri: pending ? (charge?.authorize_uri ?? null) : null,
      qrCodeUrl: pending
        ? (charge?.source?.scannable_code?.image?.download_uri ?? null)
        : null,
      expiresAt: pending ? (charge?.expires_at ?? null) : null,
      failureMessage:
        status === PaymentStatus.FAILED
          ? cancelled
            ? CANCELLED_MESSAGE
            : (charge?.failure_message ?? null)
          : null,
    };
  }

  async findPurchases(studentId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        refundedAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        purchasedAt: true,
        createdAt: true,
        purchaseItems: { select: PURCHASE_ITEM_SELECT },
      },
    });
    return purchases.map((purchase) => ({
      ...purchase,
      refundDeadline: this.openRefundDeadline(purchase),
    }));
  }

  /** เหมือน refundDeadlineOf แต่เลยกำหนดแล้วเป็น null หน้าเว็บจะได้ไม่ต้องเทียบเวลาเอง */
  private openRefundDeadline(
    purchase: Parameters<PurchaseService['refundDeadlineOf']>[0],
  ): Date | null {
    const deadline = this.refundDeadlineOf(purchase);
    return deadline && deadline.getTime() > Date.now() ? deadline : null;
  }

  /**
   * วันสุดท้ายที่ขอคืนเงินได้ (ใช้กับทุกคอร์สในคำสั่งซื้อ) null = ขอไม่ได้เลย
   * (ยังไม่จ่าย, คอร์สฟรี, คืนครบแล้ว) หน้าเว็บใช้ตัดสินว่าจะแสดงปุ่มไหม API ตรวจซ้ำ
   */
  private refundDeadlineOf(purchase: {
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod | null;
    purchasedAt: Date | null;
    total: Prisma.Decimal;
  }): Date | null {
    if (
      purchase.paymentStatus !== PaymentStatus.SUCCESS ||
      purchase.paymentMethod === PaymentMethod.FREE ||
      purchase.total.isZero() ||
      !purchase.purchasedAt
    ) {
      return null;
    }
    return refundDeadline(purchase.purchasedAt);
  }

  /**
   * นักเรียนขอคืนเงินทีละคอร์ส ยังไม่คืนจริง แอดมินต้องพิจารณาก่อน
   * ขอได้ครั้งเดียวต่อคอร์ส ภายใน REFUND_WINDOW_DAYS วันหลังจ่ายสำเร็จ
   */
  async requestRefund(
    studentId: string,
    purchaseItemId: string,
    dto: RequestRefundDto,
  ) {
    const item = await this.prisma.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      select: {
        studentId: true,
        purchaseId: true,
        price: true,
        enrollmentStatus: true,
        refundRequest: { select: { id: true } },
        purchase: {
          select: {
            total: true,
            paymentStatus: true,
            paymentMethod: true,
            purchasedAt: true,
          },
        },
      },
    });

    if (!item || item.studentId !== studentId) {
      throw new NotFoundException('Purchase not found');
    }
    if (item.refundRequest) {
      throw new ConflictException(
        "You've already requested a refund for this course",
      );
    }
    if (
      item.price.isZero() ||
      item.purchase.paymentMethod === PaymentMethod.FREE
    ) {
      throw new BadRequestException("Free courses can't be refunded");
    }

    const deadline = this.refundDeadlineOf(item.purchase);
    if (!deadline || item.enrollmentStatus !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException(
        'Only courses you currently have access to can be refunded',
      );
    }
    if (deadline.getTime() < Date.now()) {
      throw new BadRequestException(
        `Refunds can only be requested within ${REFUND_WINDOW_DAYS} days of purchase`,
      );
    }

    try {
      return await this.prisma.refundRequest.create({
        data: {
          purchaseItemId,
          purchaseId: item.purchaseId,
          studentId,
          reason: dto.reason,
        },
        select: { id: true, ...REFUND_REQUEST_SELECT },
      });
    } catch (error) {
      // กดส่งซ้ำสองครั้งพร้อมกัน: purchaseItemId เป็น unique อันที่สองชน
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          "You've already requested a refund for this course",
        );
      }
      throw error;
    }
  }

  async findPurchase(studentId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        studentId: true,
        total: true,
        refundedAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        purchasedAt: true,
        createdAt: true,
        purchaseItems: { select: PURCHASE_ITEM_SELECT },
      },
    });

    if (!purchase || purchase.studentId !== studentId) {
      throw new NotFoundException('Purchase not found');
    }

    return { ...purchase, refundDeadline: this.openRefundDeadline(purchase) };
  }
}
