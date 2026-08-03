"use server";

import { ApiError } from "@/lib/api/api-error";
import { LessonApi, LessonResponse } from "@/lib/api/lesson.api";
import { auth } from "@/lib/auth";

export async function createLessonAction(
  courseId: number,
  formData: FormData,
): Promise<
  | { success: true; lesson: LessonResponse }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  const title = formData.get("title");
  const video = formData.get("videoUrl");

  if (typeof title !== "string" || !title.trim()) {
    return { success: false, message: "Lesson title is required" };
  }

  if (!(video instanceof File) || video.size === 0) {
    return { success: false, message: "Lesson video is required" };
  }

  formData.set("courseId", String(courseId));
  formData.set("title", title.trim());

  try {
    const lesson = await LessonApi.create(
      formData,
      session.user.access_token,
    );

    return { success: true, lesson };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}

export async function moveLessonAction(
  lessonId: number,
  orderNo: number,
): Promise<
  | { success: true; lessons: LessonResponse[] }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  if (!Number.isInteger(orderNo) || orderNo < 1) {
    return { success: false, message: "Invalid lesson order" };
  }

  try {
    const lessons = await LessonApi.move(
      lessonId,
      orderNo,
      session.user.access_token,
    );

    return { success: true, lessons };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}

export async function updateLessonAction(
  lessonId: number,
  formData: FormData,
): Promise<
  | { success: true; lesson: LessonResponse }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  const title = formData.get("title");
  const video = formData.get("videoUrl");

  if (
    (typeof title !== "string" || !title.trim()) &&
    (!(video instanceof File) || video.size === 0)
  ) {
    return { success: false, message: "Title or video is required" };
  }

  if (typeof title === "string") {
    formData.set("title", title.trim());
  }

  try {
    const lesson = await LessonApi.update(
      lessonId,
      formData,
      session.user.access_token,
    );

    return { success: true, lesson };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}

export async function removeLessonAction(
  lessonId: number,
): Promise<{ success: true } | { success: false; message: string }> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    await LessonApi.remove(lessonId, session.user.access_token);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}
