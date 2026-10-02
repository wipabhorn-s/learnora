import type { PurchaseResponse } from "@/lib/api/purchase.api";

type Item = PurchaseResponse["purchaseItems"][number];

/** ขอคืนคอร์สนี้ได้ไหม: ยังอยู่ในระยะเวลา, ยังเรียนได้, ไม่ฟรี, ยังไม่เคยขอ */
export const canRequestRefund = (purchase: PurchaseResponse, item: Item) =>
  purchase.refundDeadline !== null &&
  item.enrollmentStatus === "ACTIVE" &&
  Number(item.price) > 0 &&
  item.refundRequest === null;
