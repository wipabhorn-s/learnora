import { apiFetch } from "@/lib/api/api-fetch";

type PurchaseItem = {
  id: string;
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
};

export type PurchaseResponse = {
  id: string;
  total: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  purchasedAt: string | null;
  createdAt: string;
  purchaseItems: PurchaseItem[];
};

export type CheckoutInput = { paymentMethodId?: string };

export const PurchaseApi = {
  findAll(token: string) {
    return apiFetch<PurchaseResponse[]>("/purchases", { token });
  },

  findOne(purchaseId: string, token: string) {
    return apiFetch<PurchaseResponse>(`/purchases/${purchaseId}`, { token });
  },

  checkout(data: CheckoutInput, token: string) {
    return apiFetch<PurchaseResponse>("/purchases/checkout", {
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
