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
import { PurchaseService } from '@/purchase/purchase.service';
import { BadRequestException } from '@nestjs/common';

/**
 * ทดสอบตรรกะเรื่องเงินโดยไม่ต่อฐานข้อมูลจริง: prisma และ Opn เป็น mock
 * เน้นกรณีที่พลาดแล้วเสียเงิน — จ่ายซ้ำ, QR เก่าถูกจ่ายทีหลัง, ยอดไม่ตรง
 */

const PURCHASE_ID = 'purchase-1';
const STUDENT_ID = 'student-1';
const TOTAL = new Prisma.Decimal(990); // 99,000 สตางค์

function makeCharge(overrides: Partial<OpnCharge> = {}): OpnCharge {
  return {
    id: 'chrg_test_1',
    amount: 99_000,
    currency: 'thb',
    status: 'successful',
    paid: true,
    refunded_amount: 0,
    refundable: true,
    authorize_uri: null,
    failure_code: null,
    failure_message: null,
    expires_at: null,
    metadata: { purchase_id: PURCHASE_ID, student_id: STUDENT_ID },
    source: null,
    ...overrides,
  };
}

function makePrisma() {
  const base = {
    purchase: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
    purchaseItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
    wishlist: { deleteMany: jest.fn() },
    refundRequest: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  return {
    ...base,
    // array = ทำทุกคำสั่ง, function = ส่ง client ตัวเดียวกันเป็น tx
    $transaction: jest.fn((arg: unknown): Promise<unknown> =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : (arg as (tx: typeof base) => Promise<unknown>)(base),
    ),
  };
}

function setup() {
  const prisma = makePrisma();
  const opn = {
    getCharge: jest.fn(),
    createCharge: jest.fn(),
    refund: jest.fn().mockResolvedValue({ id: 'rfnd_1', status: 'closed' }),
  };
  const config = { get: () => 'http://localhost:3000' };
  const service = new PurchaseService(
    prisma as unknown as PrismaService,
    opn as unknown as OpnService,
    config as never,
  );
  return { service, prisma, opn };
}

/** คำสั่งซื้อที่ webhook หาเจอจาก chargeId */
function givenPurchase(
  prisma: ReturnType<typeof makePrisma>,
  state: { paymentStatus: PaymentStatus; cancelledAt: Date | null },
) {
  prisma.purchase.findUnique.mockResolvedValue({ id: PURCHASE_ID });
  prisma.purchase.findUniqueOrThrow
    // applyCharge
    .mockResolvedValueOnce({ total: TOTAL, ...state })
    // finalize (ถ้ามีการเปิดคอร์ส)
    .mockResolvedValueOnce({
      studentId: STUDENT_ID,
      purchaseItems: [
        {
          id: 'item-1',
          courseId: 1,
          course: { accessType: AccessType.LIFETIME, accessDuration: null },
        },
      ],
    });
}

/** ข้อมูล finalize ส่งไปเปลี่ยนสถานะเป็น SUCCESS หรือไม่ */
type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown> & { paymentStatus?: PaymentStatus };
};

function successUpdate(
  prisma: ReturnType<typeof makePrisma>,
): UpdateManyArgs | undefined {
  const calls = prisma.purchase.updateMany.mock.calls as [UpdateManyArgs][];
  return calls
    .map(([args]) => args)
    .find((args) => args.data.paymentStatus === PaymentStatus.SUCCESS);
}

describe('PurchaseService — webhook / charge settlement', () => {
  it('unlocks the course when a pending charge is paid', async () => {
    const { service, prisma, opn } = setup();
    givenPurchase(prisma, {
      paymentStatus: PaymentStatus.PENDING,
      cancelledAt: null,
    });
    opn.getCharge.mockResolvedValue(makeCharge());

    await service.handleChargeComplete('chrg_test_1');

    const update = successUpdate(prisma);
    expect(update?.where).toMatchObject({
      id: PURCHASE_ID,
      paymentStatus: PaymentStatus.PENDING,
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalled();
    expect(opn.refund).not.toHaveBeenCalled();
  });

  it('ignores a charge whose amount does not match the order', async () => {
    const { service, prisma, opn } = setup();
    givenPurchase(prisma, {
      paymentStatus: PaymentStatus.PENDING,
      cancelledAt: null,
    });
    opn.getCharge.mockResolvedValue(makeCharge({ amount: 2_000 }));

    await service.handleChargeComplete('chrg_test_1');

    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a charge that belongs to another order', async () => {
    const { service, prisma, opn } = setup();
    givenPurchase(prisma, {
      paymentStatus: PaymentStatus.PENDING,
      cancelledAt: null,
    });
    opn.getCharge.mockResolvedValue(
      makeCharge({
        metadata: { purchase_id: 'other', student_id: STUDENT_ID },
      }),
    );

    await service.handleChargeComplete('chrg_test_1');

    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });

  it('marks the order failed when the charge expires unpaid', async () => {
    const { service, prisma, opn } = setup();
    givenPurchase(prisma, {
      paymentStatus: PaymentStatus.PENDING,
      cancelledAt: null,
    });
    opn.getCharge.mockResolvedValue(
      makeCharge({ status: 'expired', paid: false }),
    );

    await service.handleChargeComplete('chrg_test_1');

    expect(prisma.purchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { paymentStatus: PaymentStatus.FAILED },
      }),
    );
    expect(successUpdate(prisma)).toBeUndefined();
  });

  it('does nothing for an unknown charge without order metadata', async () => {
    const { service, prisma, opn } = setup();
    prisma.purchase.findUnique.mockResolvedValue(null);
    opn.getCharge.mockResolvedValue(makeCharge({ metadata: {} }));

    await service.handleChargeComplete('chrg_unknown');

    expect(prisma.purchase.findFirst).not.toHaveBeenCalled();
    expect(prisma.purchase.updateMany).not.toHaveBeenCalled();
  });
});

describe('PurchaseService — late payment on a cancelled order (old QR paid)', () => {
  const cancelled = {
    paymentStatus: PaymentStatus.FAILED,
    cancelledAt: new Date(),
  };

  function givenLatePayment(ownedCourseIds: number[]) {
    const ctx = setup();
    givenPurchase(ctx.prisma, cancelled);
    ctx.prisma.purchaseItem.findMany
      // คอร์สในคำสั่งซื้อที่ถูกยกเลิก
      .mockResolvedValueOnce([{ courseId: 1, studentId: STUDENT_ID }])
      // คอร์สที่ผู้เรียนมีอยู่แล้วจากคำสั่งซื้ออื่น
      .mockResolvedValueOnce(ownedCourseIds.map((courseId) => ({ courseId })));
    return ctx;
  }

  it('honours the payment when the student does not own the course yet', async () => {
    const { service, prisma, opn } = givenLatePayment([]);
    opn.getCharge.mockResolvedValue(makeCharge());

    await service.handleChargeComplete('chrg_test_1');

    const update = successUpdate(prisma);
    expect(update?.where).toMatchObject({
      paymentStatus: PaymentStatus.FAILED,
    });
    expect(update?.data).toMatchObject({ manualRefundNeeded: false });
    expect(opn.refund).not.toHaveBeenCalled();
  });

  it('auto-refunds a duplicate payment when the method is refundable (card)', async () => {
    const { service, prisma, opn } = givenLatePayment([1]);
    opn.getCharge.mockResolvedValue(makeCharge({ refunded_amount: 1_000 }));

    await service.handleChargeComplete('chrg_test_1');

    // คืนเฉพาะส่วนที่ยังไม่ได้คืน
    expect(opn.refund).toHaveBeenCalledWith('chrg_test_1', 98_000);
    expect(prisma.purchase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.REFUNDED,
        }) as unknown,
      }),
    );
    expect(successUpdate(prisma)).toBeUndefined();
  });

  it('flags a duplicate PromptPay payment for a manual refund', async () => {
    const { service, prisma, opn } = givenLatePayment([1]);
    opn.getCharge.mockResolvedValue(makeCharge({ refundable: false }));

    await service.handleChargeComplete('chrg_test_1');

    expect(opn.refund).not.toHaveBeenCalled();
    expect(successUpdate(prisma)?.data).toMatchObject({
      manualRefundNeeded: true,
    });
  });

  it('stops watching a cancelled charge that closed without payment', async () => {
    const { service, prisma, opn } = setup();
    givenPurchase(prisma, cancelled);
    opn.getCharge.mockResolvedValue(
      makeCharge({ status: 'expired', paid: false }),
    );

    await service.handleChargeComplete('chrg_test_1');

    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: PURCHASE_ID },
      data: { cancelledAt: null },
    });
    expect(opn.refund).not.toHaveBeenCalled();
  });
});

describe('PurchaseService — checkout guards', () => {
  function givenCart(price: number) {
    const ctx = setup();
    ctx.prisma.cartItem.findMany.mockResolvedValue([
      {
        courseId: 1,
        course: {
          title: 'Python',
          instructorId: 'someone-else',
          status: StatusCourse.PUBLISHED,
          price: new Prisma.Decimal(price),
        },
      },
    ]);
    return ctx;
  }

  it('rejects an empty cart', async () => {
    const { service, prisma } = setup();
    prisma.cartItem.findMany.mockResolvedValue([]);

    await expect(
      service.checkout(STUDENT_ID, { method: PaymentMethod.CARD }),
    ).rejects.toThrow('Your cart is empty');
  });

  it('rejects totals below the ฿20 minimum', async () => {
    const { service, opn } = givenCart(19);

    await expect(
      service.checkout(STUDENT_ID, { method: PaymentMethod.PROMPTPAY }),
    ).rejects.toThrow('The minimum payment is ฿20');
    expect(opn.createCharge).not.toHaveBeenCalled();
  });

  it('rejects TrueMoney above ฿100,000', async () => {
    const { service, opn } = givenCart(100_001);

    await expect(
      service.checkout(STUDENT_ID, {
        method: PaymentMethod.TRUEMONEY,
        phoneNumber: '0812345678',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(opn.createCharge).not.toHaveBeenCalled();
  });

  it('refuses to start a second payment while one is waiting', async () => {
    const { service, prisma, opn } = givenCart(990);
    prisma.purchase.findFirst
      .mockResolvedValueOnce(null) // ไม่มีคำขอที่กำลังส่ง
      .mockResolvedValueOnce({ id: 'waiting-qr' }); // มี QR รอจ่ายอยู่

    await expect(
      service.checkout(STUDENT_ID, { method: PaymentMethod.CARD }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_PENDING' }) as unknown,
    });
    expect(opn.createCharge).not.toHaveBeenCalled();
  });
});

describe('PurchaseService — student refund requests (per course)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const ITEM_ID = 'item-1';

  function givenPurchasedCourse(
    overrides: {
      studentId?: string;
      price?: Prisma.Decimal;
      enrollmentStatus?: EnrollmentStatus;
      refundRequest?: { id: string } | null;
      purchase?: Partial<{
        paymentStatus: PaymentStatus;
        paymentMethod: PaymentMethod;
        purchasedAt: Date;
      }>;
    } = {},
  ) {
    const ctx = setup();
    const { purchase, ...item } = overrides;
    ctx.prisma.purchaseItem.findUnique.mockResolvedValue({
      studentId: STUDENT_ID,
      purchaseId: PURCHASE_ID,
      price: new Prisma.Decimal(490),
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      refundRequest: null,
      ...item,
      purchase: {
        total: TOTAL,
        paymentStatus: PaymentStatus.SUCCESS,
        paymentMethod: PaymentMethod.CARD,
        purchasedAt: new Date(Date.now() - 3 * DAY_MS),
        ...purchase,
      },
    });
    ctx.prisma.refundRequest.create.mockResolvedValue({ id: 'request-1' });
    return ctx;
  }

  const reason = { reason: 'The course content is not what I expected.' };

  it('creates a request for one course (no money moves yet)', async () => {
    const { service, prisma, opn } = givenPurchasedCourse();

    await service.requestRefund(STUDENT_ID, ITEM_ID, reason);

    expect(prisma.refundRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          purchaseItemId: ITEM_ID,
          purchaseId: PURCHASE_ID,
          studentId: STUDENT_ID,
          ...reason,
        },
      }),
    );
    expect(opn.refund).not.toHaveBeenCalled();
  });

  it("hides other students' courses", async () => {
    const { service, prisma } = givenPurchasedCourse({ studentId: 'someone' });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow('Purchase not found');
    expect(prisma.refundRequest.create).not.toHaveBeenCalled();
  });

  it('rejects requests after the 14-day window', async () => {
    const { service, prisma } = givenPurchasedCourse({
      purchase: { purchasedAt: new Date(Date.now() - 15 * DAY_MS) },
    });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow('within 14 days');
    expect(prisma.refundRequest.create).not.toHaveBeenCalled();
  });

  it('allows only one request per course', async () => {
    const { service } = givenPurchasedCourse({ refundRequest: { id: 'old' } });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow('already requested');
  });

  it('rejects free courses', async () => {
    const { service } = givenPurchasedCourse({
      price: new Prisma.Decimal(0),
    });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow("Free courses can't be refunded");
  });

  it('rejects a course that was already refunded', async () => {
    const { service } = givenPurchasedCourse({
      enrollmentStatus: EnrollmentStatus.REFUNDED,
    });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow('currently have access');
  });

  it('rejects purchases that were never paid', async () => {
    const { service } = givenPurchasedCourse({
      purchase: { paymentStatus: PaymentStatus.FAILED },
    });

    await expect(
      service.requestRefund(STUDENT_ID, ITEM_ID, reason),
    ).rejects.toThrow('currently have access');
  });
});
