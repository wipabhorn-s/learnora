"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { AuthApi } from "@/lib/api/auth.api";
import { signIn, signOut } from "@/lib/auth";
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

  redirect("/login");
}

export async function loginAction(
  input: LoginInput,
): Promise<ErrorActionResult | void> {
  try {
    await signIn("credentials", { ...input, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return {
        success: false,
        message: "Email or password is invalid",
        code: "INVALID_CREDENTIALS",
      };
    }
    throw error;
  }

  redirect("/");
}

export async function loginWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
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
