"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { AuthApi } from "@/lib/api/auth.api";
import { auth, INSTRUCTOR_INTENT_COOKIE, signIn, signOut } from "@/lib/auth";
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

  redirect(`/verify-email/sent?email=${encodeURIComponent(parsed.data.email)}`);
}

/** ข้อความที่ผู้ใช้เห็นเมื่อล็อกอินไม่ผ่าน แยกตามสาเหตุจริงที่ API ส่งมา */
const LOGIN_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "Email or password is invalid",
  GOOGLE_ONLY_ACCOUNT:
    "This account was created with Google. Use Continue with Google, or set a password via Forgot password.",
  ACCOUNT_SUSPENDED:
    "Your account has been suspended. Please contact support.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email first. Check your inbox for the verification link.",
  SERVICE_UNAVAILABLE:
    "We could not reach the server. Please try again in a moment.",
};

export async function loginAction(
  input: LoginInput,
): Promise<ErrorActionResult | void> {
  try {
    await signIn("credentials", { ...input, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const code = error.code ?? "INVALID_CREDENTIALS";

      return {
        success: false,
        message: LOGIN_ERRORS[code] ?? LOGIN_ERRORS.INVALID_CREDENTIALS,
        code,
      };
    }
    throw error;
  }

  redirect("/");
}

/**
 * ปุ่ม Google อยู่คนละฟอร์มกับฟอร์มสมัคร ค่า role ที่กดเลือกไว้จึงไม่เคย
 * เดินทางไปถึง API เลย — ฝากไว้ในคุกกี้อายุสั้นก่อนออกไป Google แล้วให้
 * jwt callback หยิบไปส่งต่อตอนขากลับ
 */
export async function loginWithGoogleAction(formData?: FormData): Promise<void> {
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

  redirect("/forgot-password/confirm");
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
