"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { AdminApi, CreateAdminInput } from "@/lib/api/admin.api";
import { ApiError } from "@/lib/api/api-error";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserStatusAction(userId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateUserStatus(userId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/users");
}

export async function updateCourseStatusAction(courseId: number) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateCourseStatus(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/courses?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/courses");
}

/** คืนเงินจริงผ่าน Opn ผลลัพธ์แสดงเป็น toast ในหน้า Payments */
export async function refundPurchaseAction(
  purchaseId: string,
  /** โอนคืนเองแล้ว (ช่องทางที่คืนผ่าน Opn ไม่ได้) พร้อมเลขอ้างอิงการโอน */
  manual?: { reference: string },
): Promise<{ success: true; message: string } | ErrorActionResult> {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.refundPurchase(
      purchaseId,
      session.user.access_token,
      manual ? { manual: true, reference: manual.reference.trim() } : {},
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "REFUND_FAILED",
      };
    }
    throw error;
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/dashboard");
  return {
    success: true,
    message: manual ? "Marked as refunded" : "Payment refunded",
  };
}

/** อนุมัติคำขอคืนเงิน = คืนเงินจริง (ผ่าน Opn หรือบันทึกว่าโอนคืนเองแล้ว) */
export async function approveRefundRequestAction(
  requestId: string,
  manual?: { reference: string },
): Promise<{ success: true; message: string } | ErrorActionResult> {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.approveRefundRequest(
      requestId,
      session.user.access_token,
      manual ? { manual: true, reference: manual.reference.trim() } : {},
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "REFUND_FAILED",
      };
    }
    throw error;
  }

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Refund approved and processed" };
}

export async function rejectRefundRequestAction(
  requestId: string,
  note: string,
): Promise<{ success: true; message: string } | ErrorActionResult> {
  const session = await auth();
  if (!session) redirect("/login");

  if (!note.trim()) {
    return {
      success: false,
      message: "Tell the student why the request was declined",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await AdminApi.rejectRefundRequest(
      requestId,
      note.trim(),
      session.user.access_token,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "REJECT_FAILED",
      };
    }
    throw error;
  }

  revalidatePath("/admin/refunds");
  return { success: true, message: "Refund request declined" };
}

export async function updateAdminStatusAction(adminId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateAdminStatus(adminId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/admins");
}

export async function createAdminAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const data: CreateAdminInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  try {
    await AdminApi.createAdmin(data, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}
