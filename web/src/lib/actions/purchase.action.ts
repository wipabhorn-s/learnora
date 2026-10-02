"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import {
  CheckoutInput,
  PaymentProgress,
  PurchaseApi,
} from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";

/**
 * พาไปหน้าถัดไปตามผลการจ่ายเงิน ใช้ทั้งตอนกดจ่ายและตอนหน้ารอผลเช็กสถานะ
 * redirect() ทำงานด้วยการ throw ฟังก์ชันนี้จึงไม่คืนค่า
 *
 * ใช้ replace ทุกครั้ง: หน้าผลลัพธ์แทนที่หน้า checkout/หน้ารอจ่ายใน history
 * กดย้อนกลับหลังจ่ายเสร็จจะได้ไม่กลับไปเจอฟอร์มจ่ายเงินอีก
 */
function redirectByProgress(progress: PaymentProgress): never {
  const { purchaseId, status, authorizeUri, failureMessage } = progress;
  // ต้องประกาศ type ไว้ตรงตัวแปร TS ถึงจะรู้ว่าเรียกแล้วไม่กลับมา
  const go: (url: string) => never = (url) =>
    redirect(url, RedirectType.replace);

  if (status === "SUCCESS") {
    go(`/payment-success?purchaseId=${purchaseId}`);
  }
  if (status === "FAILED" || status === "REFUNDED") {
    const query = failureMessage
      ? `?message=${encodeURIComponent(failureMessage)}`
      : "";
    go(`/payment-failed${query}`);
  }
  // TrueMoney / แอปธนาคาร / บัตรที่ต้องยืนยัน 3-D Secure: ไปหน้าของผู้ให้บริการ
  // (URL มาจาก Opn ผ่าน API ของเรา ไม่ได้มาจากผู้ใช้)
  if (authorizeUri) go(authorizeUri);

  // พร้อมเพย์: หน้าแสดง QR และคอยเช็กสถานะ
  go(`/checkout/pending?purchaseId=${purchaseId}`);
}

/**
 * จ่ายจบแล้ว (สำเร็จ/ไม่ผ่าน) ล้างหน้าที่ browser จำไว้ทั้งหมด ตะกร้า,
 * My Courses, หน้าคอร์ส ฯลฯ ที่กดย้อนกลับไปจะได้ไม่แสดงข้อมูลก่อนจ่าย
 * เรียกได้เฉพาะใน action (ไม่ใช่ตอน render หน้า)
 */
function revalidateIfSettled(progress: PaymentProgress) {
  if (progress.status !== "PENDING") revalidatePath("/", "layout");
}

export async function checkoutAction(
  input: CheckoutInput,
): Promise<ErrorActionResult | void> {
  const session = await auth();
  if (!session) redirect("/login");

  let progress: PaymentProgress;
  try {
    progress = await PurchaseApi.checkout(input, session.user.access_token);
  } catch (error) {
    // มีรายการรอจ่ายอยู่ (เช่นเพิ่งเปิดอีกแท็บ) กลับไปหน้า checkout ซึ่งจะพาไปหน้าจ่ายเดิม
    if (error instanceof ApiError && error.code === "PAYMENT_PENDING") {
      redirect("/checkout");
    }
    // เช่น บัตรถูกปฏิเสธ เบอร์ TrueMoney ผิด ยอดต่ำกว่าขั้นต่ำ แสดงให้แก้แล้วลองใหม่
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "CHECKOUT_FAILED",
      };
    }
    throw error;
  }

  revalidateIfSettled(progress);
  redirectByProgress(progress);
}

/**
 * หน้ารอผลเรียกซ้ำเป็นระยะ ยังค้างอยู่คืนสถานะล่าสุด (QR ยังใช้ได้อยู่ไหม)
 * จบแล้วพาไปหน้าผลลัพธ์เลย
 */
export async function getPaymentProgressAction(
  purchaseId: string,
): Promise<PaymentProgress> {
  const session = await auth();
  if (!session) redirect("/login");

  const progress = await PurchaseApi.progress(
    purchaseId,
    session.user.access_token,
  );

  if (progress.status !== "PENDING") redirectByProgress(progress);
  return progress;
}

/** หน้ารอผล (ฝั่ง browser) เรียกถามซ้ำเป็นระยะ ต่างจากข้างบนตรงที่ล้างแคชหน้าได้ */
export async function pollPaymentProgressAction(
  purchaseId: string,
): Promise<PaymentProgress> {
  const session = await auth();
  if (!session) redirect("/login");

  const progress = await PurchaseApi.progress(
    purchaseId,
    session.user.access_token,
  );

  revalidateIfSettled(progress);
  if (progress.status !== "PENDING") redirectByProgress(progress);
  return progress;
}

/** คอร์สฟรี: ลงทะเบียนแล้วพาเข้าห้องเรียนทันที ผิดพลาดกลับหน้าคอร์สพร้อม toast */
export async function enrollFreeAction(courseId: number): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await PurchaseApi.enrollFree(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(
        `/courses/${courseId}?cartError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  revalidatePath("/my-courses");
  redirect(`/my-courses/${courseId}/player`);
}

/** นักเรียนขอคืนเงินทีละคอร์ส แอดมินจะพิจารณาภายหลัง (ยังไม่คืนเงินทันที) */
export async function requestRefundAction(
  purchaseItemId: string,
  reason: string,
): Promise<ErrorActionResult | { success: true; message: string }> {
  const session = await auth();
  if (!session) redirect("/login");

  const trimmed = reason.trim();
  if (trimmed.length < 10 || trimmed.length > 1000) {
    return {
      success: false,
      message: "Please give a reason between 10 and 1,000 characters",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await PurchaseApi.requestRefund(
      purchaseItemId,
      trimmed,
      session.user.access_token,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "REFUND_REQUEST_FAILED",
      };
    }
    throw error;
  }

  revalidatePath("/purchase-history");
  return {
    success: true,
    message: "Refund request sent. We'll email you once it's reviewed.",
  };
}
