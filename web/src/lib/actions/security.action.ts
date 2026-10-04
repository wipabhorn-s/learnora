"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { SecurityOverview } from "@/lib/api/api.type";
import { UserApi } from "@/lib/api/user.api";
import { auth, signOut, unstable_update } from "@/lib/auth";
import { WORKSPACE_HOME } from "@/lib/constants/workspace";
import { passwordSchema } from "@/lib/schemas/password.schema";
import { ChangeEmailInput, changeEmailSchema } from "@/lib/schemas/user.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

type OkResult = { success: true; message: string };

const UNAUTHORIZED: ErrorActionResult = {
  success: false,
  message: "Unauthorized",
  code: "UNAUTHORIZED",
};

/** แปลง ApiError เป็นผลลัพธ์ที่ฟอร์มเอาไปแสดงได้ ไม่ปล่อยให้ระเบิดเป็น 500 */
function toErrorResult(error: unknown): ErrorActionResult {
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      code: error.code ?? `HTTP_${error.statusCode}`,
    };
  }
  throw error;
}

export async function getSecurityOverviewAction(): Promise<SecurityOverview | null> {
  const session = await auth();
  if (!session) return null;

  return UserApi.getSecurity(session.user.access_token);
}

export async function setPasswordAction(
  newPassword: string,
): Promise<OkResult | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  const parsed = passwordSchema.safeParse(newPassword);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const { message } = await UserApi.setPassword(
      parsed.data,
      session.user.access_token,
    );
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function connectGoogleAction(
  idToken: string,
): Promise<OkResult | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  try {
    const { message } = await UserApi.connectGoogle(
      idToken,
      session.user.access_token,
    );
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function disconnectGoogleAction(): Promise<
  OkResult | ErrorActionResult
> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  try {
    const { message } = await UserApi.disconnectGoogle(
      session.user.access_token,
    );
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function changeEmailAction(
  input: ChangeEmailInput,
): Promise<OkResult | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  const parsed = changeEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const { message } = await UserApi.changeEmail(
      parsed.data,
      session.user.access_token,
    );
    // อีเมลยังไม่เปลี่ยนจนกว่าจะกดลิงก์ จึงไม่แตะ session ตรงนี้
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

// --- การยืนยันตัวตน 2 ขั้นตอน ---

/** ขั้นแรกของการเปิด: API ส่งรหัสไปที่อีเมล คืน challengeId ไว้ใช้ตอนยืนยัน */
export async function requestTwoFactorAction(): Promise<
  (OkResult & { challengeId: string }) | ErrorActionResult
> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  try {
    const { challengeId, message } = await UserApi.requestTwoFactor(
      session.user.access_token,
    );
    return { success: true, message, challengeId };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function confirmTwoFactorAction(
  challengeId: string,
  code: string,
): Promise<OkResult | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      message: "Enter the 6-digit code from your email",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const { message } = await UserApi.confirmTwoFactor(
      challengeId,
      code,
      session.user.access_token,
    );
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function disableTwoFactorAction(
  password: string,
): Promise<OkResult | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  if (!password) {
    return {
      success: false,
      message: "Enter your password to turn this off",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const { message } = await UserApi.disableTwoFactor(
      password,
      session.user.access_token,
    );
    revalidatePath("/profile");
    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** บัญชีที่ไม่มีรหัสผ่าน: พิมพ์อีเมลของบัญชีแล้วรับรหัสยืนยันการลบทางอีเมล */
export async function requestDeleteCodeAction(
  email: string,
): Promise<(OkResult & { challengeId: string }) | ErrorActionResult> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  if (!email.trim()) {
    return {
      success: false,
      message: "Enter your email address",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const { challengeId, message } = await UserApi.requestDeleteCode(
      email.trim(),
      session.user.access_token,
    );
    return { success: true, message, challengeId };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * ลบบัญชีตัวเอง สำเร็จแล้วล็อกเอาต์และพาไปหน้ายืนยันว่าลบแล้ว (redirect)
 * คืนค่าเฉพาะตอนผิดพลาด เช่นรหัสผ่านผิด หรือยังมีคอร์สที่สอนอยู่
 */
export async function deleteAccountAction(
  input: { password: string } | { challengeId: string; code: string },
): Promise<ErrorActionResult | void> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  if ("password" in input ? !input.password : !/^\d{6}$/.test(input.code)) {
    return {
      success: false,
      message:
        "password" in input
          ? "Enter your password to continue"
          : "Enter the 6-digit code from your email",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await UserApi.deleteAccount(input, session.user.access_token);
  } catch (error) {
    return toErrorResult(error);
  }

  await signOut({ redirectTo: "/account-deleted" });
}

/** สำเร็จแล้วพาเข้าฝั่งสอนทันที ไม่คืนค่าอะไร (redirect) คืนเฉพาะตอนผิดพลาด */
export async function becomeInstructorAction(): Promise<ErrorActionResult | void> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  try {
    const { access_token } = await UserApi.becomeInstructor(
      session.user.access_token,
    );

    // API ออก token ใบใหม่ที่มีสิทธิ์สอนมาให้ ต้องเก็บลง session แทนใบเดิม
    // ไม่งั้นทุก request ฝั่งสอนจะยังถือ token ที่ isInstructor เป็น false
    await unstable_update({
      user: { isInstructor: true, access_token },
    });
    revalidatePath("/", "layout");
  } catch (error) {
    return toErrorResult(error);
  }

  // อยู่นอก try เพราะ redirect() ทำงานด้วยการ throw
  redirect(WORKSPACE_HOME.teach);
}
