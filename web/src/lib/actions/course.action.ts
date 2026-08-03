"use server";

import { ErrorActionResult } from "@/lib/actions/action.type";
import { ApiError } from "@/lib/api/api-error";
import { CourseApi } from "@/lib/api/course.api";
import { auth } from "@/lib/auth";
import { createCourseSchema } from "@/lib/schemas/course.schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import z from "zod";

export async function createCourseAction(
  formData: FormData,
): Promise<ErrorActionResult | { success: true; courseId: number }> {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const accessDuration = formData.get("accessDuration");

  const parsed = createCourseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: Number(formData.get("price") ?? NaN),
    category: formData.get("category"),
    level: formData.get("level"),
    accessType: formData.get("accessType"),
    accessDuration: accessDuration ? Number(accessDuration) : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: z.flattenError(parsed.error),
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const course = await CourseApi.create(
      formData,
      session.user.access_token,
    );

    return { success: true, courseId: course.id };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        message: error.message,
        code: "API_ERROR",
      };
    }

    throw error;
  }
}

export async function removeCourseAction(courseId: number): Promise<
  | { success: true }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await CourseApi.remove(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }

  revalidatePath("/instructor/courses");

  return { success: true };
}

export async function updateCourseAction(
  courseId: number,
  formData: FormData,
): Promise<
  | { success: true; course: Awaited<ReturnType<typeof CourseApi.update>> }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const course = await CourseApi.update(
      courseId,
      formData,
      session.user.access_token,
    );

    revalidatePath("/instructor/courses");
    revalidatePath(`/instructor/courses/${courseId}/edit`);

    return { success: true, course };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}

export async function updateCourseStatusAction(
  courseId: number,
  status: "DRAFT" | "PUBLISHED",
): Promise<{ success: true } | { success: false; message: string }> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await CourseApi.updateStatus(
      courseId,
      status,
      session.user.access_token,
    );
    revalidatePath("/instructor/courses");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}
