"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { SecurityOverview } from "@/lib/api/api.type";
import { UserApi } from "@/lib/api/user.api";
import { auth, unstable_update } from "@/lib/auth";
import {
  ChangeEmailInput,
  changeEmailSchema,
} from "@/lib/schemas/user.schema";
import { revalidatePath } from "next/cache";
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

  const parsed = z
    .string()
    .regex(
      /^[0-9a-zA-Z]{8,}$/,
      "Password must be at least 8 characters and contain only letters and numbers",
    )
    .safeParse(newPassword);

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

export async function becomeInstructorAction(): Promise<
  OkResult | ErrorActionResult
> {
  const session = await auth();
  if (!session) return UNAUTHORIZED;

  try {
    const { message, access_token } = await UserApi.becomeInstructor(
      session.user.access_token,
    );

    // API ออก token ใบใหม่ที่มีสิทธิ์สอนมาให้ ต้องเก็บลง session แทนใบเดิม
    // ไม่งั้นทุก request ฝั่งสอนจะยังถือ token ที่ isInstructor เป็น false
    await unstable_update({
      user: { isInstructor: true, access_token },
    });
    revalidatePath("/", "layout");

    return { success: true, message };
  } catch (error) {
    return toErrorResult(error);
  }
}
