import { apiFetch } from "@/lib/api/api-fetch";

export type PayoutAccount = {
  /** รหัสธนาคารตามที่ Opn รองรับ (null = บัญชีเก่าที่พิมพ์ชื่อธนาคารเอง ต้องเลือกใหม่) */
  bankCode: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  updatedAt: string;
};

/** ยอดเงินเป็นสตริงทศนิยม 2 ตำแหน่ง (Decimal จาก API) */
export type EarningsSummary = {
  totalEarned: string;
  /** ยังอยู่ในช่วงขอคืนเงิน 14 วัน หรือมีคำขอคืนเงินค้าง */
  pending: string;
  paidOut: string;
  /** จ่ายได้ตอนนี้ ติดลบได้ถ้ามีการคืนเงินหลังจ่ายไปแล้ว */
  available: string;
};

export type Payout = {
  id: string;
  amount: string;
  reference: string;
  createdAt: string;
};

export type InstructorEarnings = EarningsSummary & {
  sharePercent: number;
  account: PayoutAccount | null;
  payouts: Payout[];
};

type PersonName = { firstName: string; lastName: string };

export type AdminPayoutOverview = {
  sharePercent: number;
  instructors: (EarningsSummary &
    PersonName & {
      id: string;
      email: string;
      account: PayoutAccount | null;
    })[];
  recentPayouts: (Payout & {
    instructor: PersonName;
    recordedBy: PersonName;
  })[];
};

/** ส่งแค่รหัสธนาคาร ชื่อธนาคาร API เติมให้เอง */
export type PayoutAccountInput = Pick<
  PayoutAccount,
  "accountName" | "accountNumber"
> & { bankCode: string };

export const PayoutApi = {
  getEarnings(token: string) {
    return apiFetch<InstructorEarnings>("/instructor/earnings", { token });
  },

  saveAccount(input: PayoutAccountInput, token: string) {
    return apiFetch("/instructor/earnings/account", {
      method: "PUT",
      body: input,
      token,
    });
  },

  getAdminOverview(token: string) {
    return apiFetch<AdminPayoutOverview>("/admin/payouts", { token });
  },

  recordPayout(
    input: { instructorId: string; amount: number; reference: string },
    token: string,
  ) {
    return apiFetch("/admin/payouts", { method: "POST", body: input, token });
  },
};
