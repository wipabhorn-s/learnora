import z from "zod";

/** บัญชีธนาคารรับเงินของผู้สอน (เลขบัญชีตัดขีด/ช่องว่างออกก่อนตรวจ) */
export const payoutAccountSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required").max(100),
  accountName: z
    .string()
    .trim()
    .min(1, "Account holder name is required")
    .max(100),
  accountNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{6,20}$/, "Account number must be 6-20 digits")),
});

export type PayoutAccountFormInput = z.input<typeof payoutAccountSchema>;
export type PayoutAccountInput = z.output<typeof payoutAccountSchema>;
