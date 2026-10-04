"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { AuthApi } from "@/lib/api/auth.api";
import { auth, INSTRUCTOR_INTENT_COOKIE, signIn, signOut } from "@/lib/auth";
import { rememberEmailSent } from "@/lib/email-sent-cookie";
import {
  clearLoginChallenge,
  getLoginChallenge,
  setLoginChallenge,
} from "@/lib/login-challenge";
import { LOGIN_ERRORS, loginErrorMessage } from "@/lib/login-errors";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
  LoginInput,
  RegisterInput,
  registerSchema,
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/schemas/auth.schema";
import { CredentialsSignin } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import z from "zod";

export async function registerAction(
  input: RegisterInput,
): Promise<ErrorActionResult | void> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await AuthApi.register(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return {
        success: false,
        message: "Email already in use",
        code: "EMAIL_ALREADY_EXISTS",
      };
    }
    throw error;
  }

  await rememberEmailSent("verify", parsed.data.email);
  redirect("/verify-email/sent");
}

/** ทั้งขั้นรหัสผ่านและขั้นรหัส 6 หลักจบเหมือนกัน: ผ่านแล้วไปหน้าแรก */
async function signInWithCredentials(
  fields: Record<string, string>,
): Promise<ErrorActionResult | void> {
  try {
    await signIn("credentials", { ...fields, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const code = error.code ?? "INVALID_CREDENTIALS";
      return {
        success: false,
        message: loginErrorMessage(code),
        code: code.split(":")[0],
      };
    }
    throw error;
  }

  redirect("/");
}

export async function loginAction(
  input: LoginInput,
): Promise<ErrorActionResult | void> {
  return signInWithCredentials(input);
}

export async function verifyLoginCodeAction(
  code: string,
): Promise<ErrorActionResult | void> {
  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      message: "Enter the 6-digit code from your email.",
      code: "OTP_INVALID",
    };
  }

  return signInWithCredentials({ code });
}

export async function resendLoginCodeAction(): Promise<
  { success: true; message: string } | ErrorActionResult
> {
  const challengeId = await getLoginChallenge();
  if (!challengeId) {
    return {
      success: false,
      message: LOGIN_ERRORS.OTP_SESSION_EXPIRED,
      code: "OTP_SESSION_EXPIRED",
    };
  }

  try {
    const result = await AuthApi.resendLoginCode(challengeId);
    await setLoginChallenge(result.challengeId);
    return { success: true, message: result.message };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.code ?? "API_ERROR",
      };
    }
    throw error;
  }
}

/** กด "ใช้บัญชีอื่น / กลับ" ระหว่างรอรหัส ทิ้งคำขอค้างไว้ไม่ให้ใช้ต่อได้ */
export async function cancelLoginCodeAction(): Promise<void> {
  await clearLoginChallenge();
}

/**
 * ปุ่ม Google อยู่คนละฟอร์มกับฟอร์มสมัคร ค่า role ที่กดเลือกไว้จึงไม่เคย
 * เดินทางไปถึง API เลย — ฝากไว้ในคุกกี้อายุสั้นก่อนออกไป Google แล้วให้
 * jwt callback หยิบไปส่งต่อตอนขากลับ
 */
export async function loginWithGoogleAction(
  formData?: FormData,
): Promise<void> {
  const asInstructor = formData?.get("asInstructor") === "true";
  const cookieStore = await cookies();

  if (asInstructor) {
    cookieStore.set(INSTRUCTOR_INTENT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });
  } else {
    cookieStore.delete(INSTRUCTOR_INTENT_COOKIE);
  }

  await signIn("google", { redirectTo: "/" });
}

export async function verifyEmailAction(
  token: string,
): Promise<{ success: true; message: string } | ErrorActionResult> {
  try {
    const { message } = await AuthApi.verifyEmail(token);

    // เปลี่ยนอีเมลสำเร็จแล้ว session ที่ค้างอยู่ยังถืออีเมลเดิม (อยู่ใน JWT
    // ทั้งของ NextAuth และของ API) ออกจากระบบให้เลยเพื่อไม่ให้เห็นข้อมูลเก่า
    if (await auth()) {
      await signOut({ redirect: false });
    }

    return { success: true, message };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: error.statusCode === 409 ? "EMAIL_TAKEN" : "INVALID_TOKEN",
      };
    }
    throw error;
  }
}

export async function resendVerificationAction(
  email: string,
): Promise<{ success: true; message: string } | ErrorActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email address",
      code: "VALIDATION_ERROR",
    };
  }

  const { message } = await AuthApi.resendVerification(parsed.data.email);
  await rememberEmailSent("verify", parsed.data.email);
  return { success: true, message };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ErrorActionResult | void> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  await AuthApi.forgotPassword(parsed.data);

  await rememberEmailSent("reset", parsed.data.email);
  redirect("/forgot-password/confirm");
}

export async function resendPasswordResetAction(
  email: string,
): Promise<{ success: true; message: string } | ErrorActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email address",
      code: "VALIDATION_ERROR",
    };
  }

  const { message } = await AuthApi.forgotPassword(parsed.data);
  await rememberEmailSent("reset", parsed.data.email);
  return { success: true, message };
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ErrorActionResult | void> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await AuthApi.resetPassword(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return {
        success: false,
        message: "This reset link is invalid or has expired",
        code: "INVALID_TOKEN",
      };
    }
    throw error;
  }

  redirect("/login");
}
