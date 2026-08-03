"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { UserApi } from "@/lib/api/user.api";
import { auth, unstable_update } from "@/lib/auth";
import {
  ChangePasswordInput,
  UpdateProfileInput,
  changePasswordInputSchema,
  updateProfileSchema,
} from "@/lib/schemas/user.schema";
import { revalidatePath } from "next/cache";
import z from "zod";

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ErrorActionResult | { success: true }> {
  const session = await auth();
  if (!session) {
    return { success: false, message: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  const user = await UserApi.updateProfile(
    parsed.data,
    session.user.access_token,
  );

  await unstable_update({
    user: { firstName: user.firstName, lastName: user.lastName },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ErrorActionResult | { success: true }> {
  const session = await auth();
  if (!session) {
    return { success: false, message: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const parsed = changePasswordInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await UserApi.changePassword(parsed.data, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 401) {
        return {
          success: false,
          message: "Current password is incorrect",
          code: "WRONG_PASSWORD",
        };
      }
      if (error.statusCode === 400) {
        return { success: false, message: error.message, code: "BAD_REQUEST" };
      }
    }
    throw error;
  }

  return { success: true };
}

export async function updateAvatarAction(
  formData: FormData,
): Promise<ErrorActionResult | { success: true; url: string }> {
  const session = await auth();
  if (!session) {
    return { success: false, message: "Unauthorized", code: "UNAUTHORIZED" };
  }

  let url: string;

  try {
    const result = await UserApi.updateAvatar(
      formData,
      session.user.access_token,
    );
    url = result.url;
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: "API_ERROR" };
    }
    throw error;
  }

  await unstable_update({ user: { avatarUrl: url } });
  revalidatePath("/", "layout");

  return { success: true, url };
}

export async function removeAvatarAction(): Promise<
  ErrorActionResult | { success: true }
> {
  const session = await auth();
  if (!session) {
    return { success: false, message: "Unauthorized", code: "UNAUTHORIZED" };
  }

  try {
    await UserApi.removeAvatar(session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: "API_ERROR" };
    }
    throw error;
  }

  await unstable_update({ user: { avatarUrl: null } });
  revalidatePath("/", "layout");

  return { success: true };
}
