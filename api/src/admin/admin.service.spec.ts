import { AdminService } from '@/admin/admin.service';
import { Prisma } from '@/database/generated/prisma/client';
import {
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
  RefundRequestStatus,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { OpnCharge, OpnService } from '@/infrastructure/payment/opn.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * แอดมินพิจารณาคำขอคืนเงินรายคอร์ส: คืนแค่ราคาคอร์สนั้น, คืนเงินพลาดต้องย้อนสถานะ,
 * พร้อมเพย์ต้องโอนคืนเอง, กดซ้ำต้องไม่คืนสองรอบ
 */

const REQUEST_ID = 'request-1';
const ITEM_ID = 'item-1';
const PURCHASE_ID = 'purchase-1';
const ADMIN_ID = 'admin-1';
const ITEM_PRICE = new Prisma.Decimal(490); // 49,000 สตางค์
const ORDER_TOTAL = new Prisma.Decimal(990);

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
    metadata: {},
    source: null,
    ...overrides,
  };
}

function setup(
  options: {
    paymentMethod?: PaymentMethod;
    requestStatus?: RefundRequestStatus;
    /** ยอดที่คืนไปแล้วหลังคืนคอร์สนี้ (ใช้ตัดสินว่าคืนครบทั้งออเดอร์หรือยัง) */
    refundedAfter?: Prisma.Decimal;
  } = {},
) {
  const base = {
    refundRequest: {
      findUnique: jest.fn().mockResolvedValue({
        status: options.requestStatus ?? RefundRequestStatus.PENDING,
        purchaseItemId: ITEM_ID,
        student: { email: 'student@test.local' },
        purchase: {
          paymentMethod: options.paymentMethod ?? PaymentMethod.CARD,
        },
        purchaseItem: { price: ITEM_PRICE, course: { title: 'Python' } },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    purchaseItem: {
      findUnique: jest.fn().mockResolvedValue({
        price: ITEM_PRICE,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        purchaseId: PURCHASE_ID,
        purchase: {
          chargeId: 'chrg_test_1',
          paymentStatus: PaymentStatus.SUCCESS,
        },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    purchase: {
      update: jest.fn().mockResolvedValue({
        total: ORDER_TOTAL,
        refundedAmount: options.refundedAfter ?? ITEM_PRICE,
      }),
    },
  };
  const prisma = {
    ...base,
    $transaction: jest.fn((arg: unknown): Promise<unknown> =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : (arg as (tx: typeof base) => Promise<unknown>)(base),
    ),
  };
  const opn = {
    getCharge: jest.fn().mockResolvedValue(
      makeCharge({
        refundable: options.paymentMethod !== PaymentMethod.PROMPTPAY,
      }),
    ),
    refund: jest.fn().mockResolvedValue({ id: 'rfnd_1', status: 'closed' }),
  };
  const mail = { sendRefundDecision: jest.fn().mockResolvedValue(undefined) };

  const service = new AdminService(
    prisma as unknown as PrismaService,
    {} as never,
    opn as unknown as OpnService,
    mail as unknown as MailService,
  );
  return { service, prisma, opn, mail };
}

describe('AdminService — approving a refund request', () => {
  it('refunds only that course through Opn and emails the student', async () => {
    const { service, prisma, opn, mail } = setup();

    await service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {});

    expect(opn.refund).toHaveBeenCalledWith('chrg_test_1', 49_000);
    expect(prisma.purchaseItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enrollmentStatus: EnrollmentStatus.REFUNDED },
      }),
    );
    expect(prisma.purchase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { refundedAmount: { increment: ITEM_PRICE } },
      }),
    );
    // ยังเหลือคอร์สอื่นในออเดอร์ ออเดอร์ต้องยัง SUCCESS
    expect(prisma.purchase.update).toHaveBeenCalledTimes(1);
    expect(mail.sendRefundDecision).toHaveBeenCalledWith(
      'student@test.local',
      expect.objectContaining({
        approved: true,
        amount: '฿490',
        courseTitles: ['Python'],
      }),
    );
  });

  it('marks the whole order refunded once every course has been refunded', async () => {
    const { service, prisma } = setup({ refundedAfter: ORDER_TOTAL });

    await service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {});

    expect(prisma.purchase.update).toHaveBeenLastCalledWith({
      where: { id: PURCHASE_ID },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  });

  it('never refunds more than what is left on the charge', async () => {
    const { service, opn } = setup();
    opn.getCharge.mockResolvedValue(makeCharge({ refunded_amount: 80_000 }));

    await service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {});

    expect(opn.refund).toHaveBeenCalledWith('chrg_test_1', 19_000);
  });

  it('rolls everything back when Opn refuses the refund', async () => {
    const { service, prisma, opn, mail } = setup();
    opn.refund.mockRejectedValue(new BadRequestException('Refund window over'));

    await expect(
      service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {}),
    ).rejects.toThrow('Refund window over');

    // คอร์สกลับมาเรียนได้ และคำขอกลับไปรอพิจารณา
    expect(prisma.purchaseItem.update).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      data: { enrollmentStatus: EnrollmentStatus.ACTIVE },
    });
    expect(prisma.refundRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RefundRequestStatus.PENDING,
        }) as unknown,
      }),
    );
    expect(prisma.purchase.update).not.toHaveBeenCalled();
    expect(mail.sendRefundDecision).not.toHaveBeenCalled();
  });

  it('asks for a manual transfer when the payment was PromptPay', async () => {
    const { service, prisma, opn } = setup({
      paymentMethod: PaymentMethod.PROMPTPAY,
    });

    await expect(
      service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {}),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REFUND_NOT_SUPPORTED',
      }) as unknown,
    });
    expect(opn.refund).not.toHaveBeenCalled();
    expect(prisma.purchaseItem.updateMany).not.toHaveBeenCalled();
    expect(prisma.refundRequest.update).toHaveBeenCalled(); // ย้อนกลับเป็นรอพิจารณา
  });

  it('records a manual transfer without calling Opn', async () => {
    const { service, prisma, opn } = setup({
      paymentMethod: PaymentMethod.PROMPTPAY,
    });

    await service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {
      manual: true,
      reference: 'TRF-123',
    });

    expect(opn.getCharge).not.toHaveBeenCalled();
    expect(opn.refund).not.toHaveBeenCalled();
    expect(prisma.refundRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refundReference: 'TRF-123',
        }) as unknown,
      }),
    );
  });

  it('refuses a request that was already reviewed', async () => {
    const { service, opn } = setup({
      requestStatus: RefundRequestStatus.APPROVED,
    });

    await expect(
      service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {}),
    ).rejects.toThrow(ConflictException);
    expect(opn.refund).not.toHaveBeenCalled();
  });

  it('lets only one of two admins clicking at the same time go through', async () => {
    const { service, prisma, opn } = setup();
    prisma.refundRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {}),
    ).rejects.toThrow(ConflictException);
    expect(opn.refund).not.toHaveBeenCalled();
  });

  it('still approves when the notification email fails', async () => {
    const { service, mail } = setup();
    mail.sendRefundDecision.mockRejectedValue(new Error('Brevo down'));

    await expect(
      service.approveRefundRequest(ADMIN_ID, REQUEST_ID, {}),
    ).resolves.toMatchObject({ status: RefundRequestStatus.APPROVED });
  });
});

describe('AdminService — declining a refund request', () => {
  it('saves the reason, keeps the money and emails the student', async () => {
    const { service, prisma, opn, mail } = setup();

    await service.rejectRefundRequest(ADMIN_ID, REQUEST_ID, {
      note: 'Most of the course has been completed.',
    });

    expect(prisma.refundRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RefundRequestStatus.REJECTED,
          adminNote: 'Most of the course has been completed.',
          reviewedById: ADMIN_ID,
        }) as unknown,
      }),
    );
    expect(opn.refund).not.toHaveBeenCalled();
    expect(mail.sendRefundDecision).toHaveBeenCalledWith(
      'student@test.local',
      expect.objectContaining({ approved: false }),
    );
  });
});
