"use server";

import { ApiError } from "@/lib/api/api-error";
import { LessonApi, LessonResponse } from "@/lib/api/lesson.api";
import { auth } from "@/lib/auth";
import type { VideoUploadTicket } from "@/lib/upload-video";

/**
 * ขอใบอนุญาตให้เบราว์เซอร์อัปโหลดวิดีโอตรงไป Cloudinary (ไฟล์ไม่ผ่าน server ของเรา)
 * ได้ public_id กลับมาแล้วค่อยส่งให้ createLessonAction / updateLessonAction
 */
export async function createVideoUploadAction(): Promise<
  | { success: true; ticket: VideoUploadTicket }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const ticket = await LessonApi.createVideoUpload(session.user.access_token);
    return { success: true, ticket };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }

    throw error;
  }
}

export async function createLessonAction(
  courseId: number,
  input: { title: string; videoPublicId: string },
): Promise<
  | { success: true; lesson: LessonResponse }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  const title = input.title.trim();

  if (!title) {
    return { success: false, message: "Lesson title is required" };
  }

  if (!input.videoPublicId) {
    return { success: false, message: "Lesson video is required" };
  }

  try {
    const lesson = await LessonApi.create(
      { courseId, title, videoPublicId: input.videoPublicId },
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
  input: { title?: string; videoPublicId?: string },
): Promise<
  | { success: true; lesson: LessonResponse }
  | { success: false; message: string }
> {
  const session = await auth();

  if (!session) {
    return { success: false, message: "Unauthorized" };
  }

  const title = input.title?.trim();

  if (!title && !input.videoPublicId) {
    return { success: false, message: "Title or video is required" };
  }

  try {
    const lesson = await LessonApi.update(
      lessonId,
      {
        ...(title && { title }),
        ...(input.videoPublicId && { videoPublicId: input.videoPublicId }),
      },
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
