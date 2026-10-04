import { Prisma } from '@/database/generated/prisma/client';
import { refundDeadline } from '@/purchase/refund-policy';

/** คอร์สที่ขายได้หนึ่งรายการ (ราคาที่นักเรียนจ่ายจริง) */
export type SoldItem = {
  price: Prisma.Decimal;
  purchasedAt: Date;
  /** มีคำขอคืนเงินรออนุมัติอยู่ ยังนับเป็นเงินของผู้สอนไม่ได้ */
  refundPending: boolean;
};

export type EarningsSummary = {
  /** ส่วนแบ่งทั้งหมดจากคอร์สที่ขายได้ (ยังไม่หักที่จ่ายไปแล้ว) */
  totalEarned: Prisma.Decimal;
  /** ยังอยู่ในช่วงที่นักเรียนขอคืนเงินได้ หรือมีคำขอคืนเงินค้างอยู่ */
  pending: Prisma.Decimal;
  /** จ่ายให้ผู้สอนไปแล้ว */
  paidOut: Prisma.Decimal;
  /**
   * จ่ายได้ตอนนี้ = ส่วนแบ่งที่พ้นช่วงขอคืนเงิน - ที่จ่ายไปแล้ว
   * ติดลบได้ ถ้าแอดมินคืนเงินคอร์สที่จ่ายส่วนแบ่งไปแล้ว (หักจากรอบถัดไป)
   */
  available: Prisma.Decimal;
};

/** ส่วนแบ่งของผู้สอนจากราคาหนึ่งรายการ ปัดเป็นสตางค์ (2 ตำแหน่ง) */
export function instructorShare(
  price: Prisma.Decimal,
  sharePercent: number,
): Prisma.Decimal {
  return price
    .mul(sharePercent)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * สรุปรายได้ผู้สอน
 * เงินของคอร์สหนึ่งจะ "จ่ายได้" เมื่อพ้นช่วงขอคืนเงิน (REFUND_WINDOW_DAYS) แล้ว
 * และไม่มีคำขอคืนเงินค้างอยู่ จ่ายก่อนหน้านั้นแล้วนักเรียนขอคืน แพลตฟอร์มจะขาดทุน
 */
export function summarizeEarnings(
  items: SoldItem[],
  paidOut: Prisma.Decimal,
  sharePercent: number,
  now = new Date(),
): EarningsSummary {
  let pending = new Prisma.Decimal(0);
  let cleared = new Prisma.Decimal(0);

  for (const item of items) {
    const share = instructorShare(item.price, sharePercent);
    const inRefundWindow = refundDeadline(item.purchasedAt) > now;

    if (inRefundWindow || item.refundPending) pending = pending.add(share);
    else cleared = cleared.add(share);
  }

  return {
    totalEarned: pending.add(cleared),
    pending,
    paidOut,
    available: cleared.sub(paidOut),
  };
}
