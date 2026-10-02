import { apiFetch } from "@/lib/api/api-fetch";

export type RefundRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PurchaseRefundRequest = {
  status: RefundRequestStatus;
  /** เหตุผลจากแอดมิน (มีเสมอเมื่อถูกปฏิเสธ) */
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type PurchaseItem = {
  id: string;
  price: string;
  expiresAt: string | null;
  enrollmentStatus: "ACTIVE" | "EXPIRED" | "REFUNDED";
  course: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    instructor: {
      firstName: string;
      lastName: string;
    };
  };
  /** คำขอคืนเงินของคอร์สนี้ (ขอได้ทีละคอร์ส ครั้งเดียว) */
  refundRequest: PurchaseRefundRequest | null;
};

export type PurchaseResponse = {
  id: string;
  total: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  purchasedAt: string | null;
  createdAt: string;
  /** ยอดที่คืนไปแล้ว (คืนรายคอร์ส) */
  refundedAmount: string;
  purchaseItems: PurchaseItem[];
  /** วันสุดท้ายที่ขอคืนเงินได้ null = ขอไม่ได้แล้ว (เลยกำหนด, ยังไม่จ่าย, คอร์สฟรี) */
  refundDeadline: string | null;
};

export type PaymentMethod =
  "CARD" | "PROMPTPAY" | "TRUEMONEY" | "MOBILE_BANKING";

export type MobileBank = "kbank" | "scb" | "ktb" | "bbl" | "bay";

/** ไม่ส่ง method เลยได้เฉพาะตะกร้าที่ฟรีทั้งหมด */
export type CheckoutInput = {
  method?: PaymentMethod;
  cardToken?: string;
  phoneNumber?: string;
  bank?: MobileBank;
  /** ผู้ใช้ยืนยันแล้วว่าจะยกเลิกรายการที่รอจ่ายอยู่ แล้วเริ่มใหม่ */
  replacePending?: boolean;
};

/** ผลของการสั่งซื้อ/การถามสถานะ ยัง PENDING อยู่ก็มีบอกว่าต้องทำอะไรต่อ */
export type PaymentProgress = {
  purchaseId: string;
  status: PurchaseResponse["paymentStatus"];
  authorizeUri: string | null;
  qrCodeUrl: string | null;
  expiresAt: string | null;
  failureMessage: string | null;
};

export const PurchaseApi = {
  /** คอร์สฟรี: ได้คอร์สทันที ไม่ผ่านตะกร้า */
  enrollFree(courseId: number, token: string) {
    return apiFetch<{ courseId: number; enrolled: true }>(
      `/purchases/enroll-free/${courseId}`,
      { method: "POST", token },
    );
  },

  findAll(token: string) {
    return apiFetch<PurchaseResponse[]>("/purchases", { token });
  },

  requestRefund(purchaseItemId: string, reason: string, token: string) {
    return apiFetch<PurchaseRefundRequest>(
      `/purchases/items/${purchaseItemId}/refund-request`,
      { method: "POST", body: { reason }, token },
    );
  },

  findOne(purchaseId: string, token: string) {
    return apiFetch<PurchaseResponse>(`/purchases/${purchaseId}`, { token });
  },

  progress(purchaseId: string, token: string) {
    return apiFetch<PaymentProgress>(`/purchases/${purchaseId}/progress`, {
      token,
      cache: "no-store",
    });
  },

  checkout(data: CheckoutInput, token: string) {
    return apiFetch<PaymentProgress>("/purchases/checkout", {
      method: "POST",
      body: data,
      token,
    });
  },
};

export function getOwnedCourseIds(purchases: PurchaseResponse[]) {
  return new Set(
    purchases
      .filter((purchase) => purchase.paymentStatus === "SUCCESS")
      .flatMap((purchase) => purchase.purchaseItems)
      .filter((item) => item.enrollmentStatus === "ACTIVE")
      .map((item) => item.course.id),
  );
}
