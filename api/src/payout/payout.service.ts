import { EnvVariable } from '@/config/env.validation';
import { Prisma } from '@/database/generated/prisma/client';
import {
  EnrollmentStatus,
  PaymentStatus,
  RefundRequestStatus,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { RecordPayoutDto } from '@/payout/dto/record-payout.dto';
import { SavePayoutAccountDto } from '@/payout/dto/save-payout-account.dto';
import { type SoldItem, summarizeEarnings } from '@/payout/earnings';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptField,
  encryptField,
  parseEncryptionKey,
} from '@/common/utils/field-encryption';

type Tx = Prisma.TransactionClient;

/** คอร์สที่นับเป็นรายได้: จ่ายเงินจริง (ไม่ใช่คอร์สฟรี) และยังไม่ถูกคืนเงิน */
const SOLD_ITEM_WHERE = {
  price: { gt: 0 },
  enrollmentStatus: { not: EnrollmentStatus.REFUNDED },
  purchase: {
    purchasedAt: { not: null },
    // REFUNDED = คืนเงินบางคอร์สในคำสั่งซื้อแล้ว คอร์สที่เหลือยังนับ
    paymentStatus: { in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] },
  },
} satisfies Prisma.PurchaseItemWhereInput;

const SOLD_ITEM_SELECT = {
  price: true,
  course: { select: { instructorId: true } },
  purchase: { select: { purchasedAt: true } },
  refundRequest: { select: { status: true } },
} satisfies Prisma.PurchaseItemSelect;

const ACCOUNT_SELECT = {
  bankName: true,
  accountName: true,
  accountNumber: true,
  updatedAt: true,
} satisfies Prisma.PayoutAccountSelect;

const toSoldItem = (item: {
  price: Prisma.Decimal;
  purchase: { purchasedAt: Date | null };
  refundRequest: { status: RefundRequestStatus } | null;
}): SoldItem => ({
  price: item.price,
  purchasedAt: item.purchase.purchasedAt!,
  refundPending: item.refundRequest?.status === RefundRequestStatus.PENDING,
});

const money = (value: Prisma.Decimal) => value.toFixed(2);

/**
 * ส่วนแบ่งรายได้และการจ่ายเงินผู้สอน
 * แอดมินโอนเงินเองนอกระบบ (โอนธนาคาร) แล้วบันทึกที่นี่ ระบบไม่ได้โอนเงินเอง
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly sharePercent: number;
  /** กุญแจเข้ารหัสเลขบัญชีธนาคาร (PAYOUT_ENCRYPTION_KEY) */
  private readonly accountKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    configService: ConfigService<EnvVariable, true>,
  ) {
    this.sharePercent = configService.get('INSTRUCTOR_REVENUE_SHARE_PERCENT', {
      infer: true,
    });
    this.accountKey = parseEncryptionKey(
      configService.get('PAYOUT_ENCRYPTION_KEY', { infer: true }),
    );
  }

  /** หน้า Earnings ของผู้สอน: ยอดสรุป บัญชีรับเงิน และประวัติการจ่าย */
  async getInstructorEarnings(instructorId: string) {
    const [summary, account, payouts] = await Promise.all([
      this.summarize(this.prisma, instructorId),
      this.prisma.payoutAccount.findUnique({
        where: { instructorId },
        select: ACCOUNT_SELECT,
      }),
      this.prisma.payout.findMany({
        where: { instructorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, reference: true, createdAt: true },
      }),
    ]);

    return {
      sharePercent: this.sharePercent,
      ...this.formatSummary(summary),
      account: this.readAccount(account),
      payouts: payouts.map((payout) => ({
        ...payout,
        amount: money(payout.amount),
      })),
    };
  }

  async savePayoutAccount(instructorId: string, dto: SavePayoutAccountDto) {
    // เลขบัญชีเก็บแบบเข้ารหัส ส่วนชื่อธนาคาร/ชื่อบัญชีไม่ลับเท่า เก็บปกติไว้ค้นหาได้
    const data = {
      ...dto,
      accountNumber: encryptField(dto.accountNumber, this.accountKey),
    };
    const account = await this.prisma.payoutAccount.upsert({
      where: { instructorId },
      create: { instructorId, ...data },
      update: data,
      select: ACCOUNT_SELECT,
    });

    return {
      message: 'Payout account saved',
      account: this.readAccount(account),
    };
  }

  /**
   * หน้า Payouts ของแอดมิน: ผู้สอนทุกคนที่มีรายได้ เรียงคนที่ค้างจ่ายมากสุดก่อน
   * ดึงรายการขายทั้งหมดครั้งเดียวแล้วแยกตามผู้สอน (ไม่ query ทีละคน)
   */
  async getAdminOverview() {
    const [soldItems, paidTotals, recentPayouts] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where: SOLD_ITEM_WHERE,
        select: SOLD_ITEM_SELECT,
      }),
      this.prisma.payout.groupBy({
        by: ['instructorId'],
        _sum: { amount: true },
      }),
      this.prisma.payout.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          reference: true,
          createdAt: true,
          instructor: { select: { firstName: true, lastName: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const itemsByInstructor = new Map<string, SoldItem[]>();
    for (const item of soldItems) {
      const list = itemsByInstructor.get(item.course.instructorId) ?? [];
      list.push(toSoldItem(item));
      itemsByInstructor.set(item.course.instructorId, list);
    }
    const paidByInstructor = new Map(
      paidTotals.map((row) => [row.instructorId, row._sum.amount]),
    );

    const instructorIds = [
      ...new Set([...itemsByInstructor.keys(), ...paidByInstructor.keys()]),
    ];
    const instructors = await this.prisma.user.findMany({
      where: { id: { in: instructorIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        payoutAccount: { select: ACCOUNT_SELECT },
      },
    });

    const rows = instructors.map((instructor) => {
      const summary = summarizeEarnings(
        itemsByInstructor.get(instructor.id) ?? [],
        paidByInstructor.get(instructor.id) ?? new Prisma.Decimal(0),
        this.sharePercent,
      );
      return { instructor, summary };
    });
    rows.sort((a, b) => b.summary.available.comparedTo(a.summary.available));

    return {
      sharePercent: this.sharePercent,
      instructors: rows.map(({ instructor, summary }) => ({
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email: instructor.email,
        account: this.readAccount(instructor.payoutAccount),
        ...this.formatSummary(summary),
      })),
      recentPayouts: recentPayouts.map((payout) => ({
        ...payout,
        amount: money(payout.amount),
      })),
    };
  }

  /**
   * บันทึกว่าโอนเงินให้ผู้สอนแล้ว
   * ล็อกแถวผู้สอนไว้ระหว่างคำนวณยอด (FOR UPDATE) แอดมินสองคนกดพร้อมกัน
   * จะได้ไม่จ่ายเกินยอดที่มี
   */
  async recordPayout(adminId: string, dto: RecordPayoutDto) {
    const amount = new Prisma.Decimal(dto.amount);

    const { payout, instructor } = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${dto.instructorId}::uuid FOR UPDATE`;

        const instructor = await tx.user.findUnique({
          where: { id: dto.instructorId },
          select: {
            email: true,
            deletedAt: true,
            payoutAccount: { select: { instructorId: true } },
          },
        });
        if (!instructor || instructor.deletedAt) {
          throw new NotFoundException('Instructor not found');
        }
        if (!instructor.payoutAccount) {
          throw new BadRequestException({
            message: "This instructor hasn't added a payout account yet",
            code: 'PAYOUT_ACCOUNT_MISSING',
          });
        }

        const { available } = await this.summarize(tx, dto.instructorId);
        if (amount.gt(available)) {
          throw new BadRequestException({
            message: `Amount is more than the available balance (฿${money(available)})`,
            code: 'PAYOUT_EXCEEDS_BALANCE',
          });
        }

        const payout = await tx.payout.create({
          data: {
            instructorId: dto.instructorId,
            amount,
            reference: dto.reference,
            recordedById: adminId,
          },
          select: { id: true, amount: true, reference: true, createdAt: true },
        });
        return { payout, instructor };
      },
    );

    try {
      await this.mailService.sendPayoutNotice(instructor.email, {
        amount: `฿${Number(payout.amount).toLocaleString()}`,
        reference: payout.reference,
      });
    } catch (error) {
      // บันทึกการจ่ายสำเร็จแล้ว เมลส่งไม่ได้ไม่ควรทำให้แอดมินเห็นว่าล้มเหลว
      this.logger.error('Cannot send payout email', error);
    }

    return {
      message: 'Payout recorded',
      payout: { ...payout, amount: money(payout.amount) },
    };
  }

  private async summarize(db: Tx, instructorId: string) {
    const [items, paid] = await Promise.all([
      db.purchaseItem.findMany({
        where: { ...SOLD_ITEM_WHERE, course: { instructorId } },
        select: SOLD_ITEM_SELECT,
      }),
      db.payout.aggregate({
        where: { instructorId },
        _sum: { amount: true },
      }),
    ]);

    return summarizeEarnings(
      items.map(toSoldItem),
      paid._sum.amount ?? new Prisma.Decimal(0),
      this.sharePercent,
    );
  }

  /** ถอดรหัสเลขบัญชีก่อนส่งให้เจ้าของบัญชีหรือแอดมิน (ต้องใช้โอนเงิน) */
  private readAccount<T extends { accountNumber: string }>(
    account: T | null,
  ): T | null {
    return account
      ? {
          ...account,
          accountNumber: decryptField(account.accountNumber, this.accountKey),
        }
      : null;
  }

  private formatSummary(summary: ReturnType<typeof summarizeEarnings>) {
    return {
      totalEarned: money(summary.totalEarned),
      pending: money(summary.pending),
      paidOut: money(summary.paidOut),
      available: money(summary.available),
    };
  }
}
