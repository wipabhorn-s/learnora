/** ขอคืนเงินได้ภายในกี่วันหลังจ่ายสำเร็จ (แสดงในหน้าเว็บและหน้า Terms ด้วย) */
export const REFUND_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** วันสุดท้ายที่ยังขอคืนเงินได้ */
export function refundDeadline(purchasedAt: Date): Date {
  return new Date(purchasedAt.getTime() + REFUND_WINDOW_DAYS * DAY_MS);
}
