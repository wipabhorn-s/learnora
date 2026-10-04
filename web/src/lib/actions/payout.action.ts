"use server";

import type { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { PayoutApi } from "@/lib/api/payout.api";
import { auth } from "@/lib/auth";
import { payoutAccountSchema } from "@/lib/schemas/payout.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionResult = { success: true; message: string } | ErrorActionResult;

/** แปลง error จาก API เป็นผลลัพธ์ที่หน้าเว็บแสดงเป็น toast ได้ */
function failed(error: unknown, fallbackCode: string): ErrorActionResult {
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      code: error.code ?? fallbackCode,
    };
  }
  throw error;
}

/** ผู้สอนบันทึก/แก้บัญชีธนาคารที่ใช้รับเงิน */
export async function savePayoutAccountAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = payoutAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check your account details",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await PayoutApi.saveAccount(parsed.data, session.user.access_token);
  } catch (error) {
    return failed(error, "SAVE_FAILED");
  }

  revalidatePath("/instructor/earnings");
  return { success: true, message: "Payout account saved" };
}

/** แอดมินบันทึกว่าโอนเงินให้ผู้สอนแล้ว */
export async function recordPayoutAction(input: {
  instructorId: string;
  amount: number;
  reference: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await PayoutApi.recordPayout(
      { ...input, reference: input.reference.trim() },
      session.user.access_token,
    );
  } catch (error) {
    return failed(error, "PAYOUT_FAILED");
  }

  revalidatePath("/admin/payouts");
  return { success: true, message: "Payout recorded" };
}
