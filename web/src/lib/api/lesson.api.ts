import { apiFetch } from "@/lib/api/api-fetch";
import type { VideoUploadTicket } from "@/lib/upload-video";

export type LessonResponse = {
  id: number;
  courseId: number;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  orderNo: number;
};

/** videoPublicId = public_id ของวิดีโอที่เบราว์เซอร์อัปโหลดตรงไป Cloudinary แล้ว */
export type CreateLessonInput = {
  courseId: number;
  title: string;
  videoPublicId: string;
};
export type UpdateLessonInput = { title?: string; videoPublicId?: string };

export const LessonApi = {
  /** ขอใบอนุญาตอัปโหลดวิดีโอ 1 ไฟล์ตรงไป Cloudinary */
  createVideoUpload(token: string) {
    return apiFetch<VideoUploadTicket>("/lessons/video-upload", {
      method: "POST",
      token,
    });
  },

  create(input: CreateLessonInput, token: string) {
    return apiFetch<LessonResponse>("/lessons", {
      method: "POST",
      body: input,
      token,
    });
  },

  update(lessonId: number, input: UpdateLessonInput, token: string) {
    return apiFetch<LessonResponse>(`/lessons/${lessonId}`, {
      method: "PATCH",
      body: input,
      token,
    });
  },

  remove(lessonId: number, token: string) {
    return apiFetch<{ message: string }>(`/lessons/${lessonId}`, {
      method: "DELETE",
      token,
    });
  },

  move(lessonId: number, orderNo: number, token: string) {
    return apiFetch<LessonResponse[]>(`/lessons/${lessonId}/move`, {
      method: "PATCH",
      body: { orderNo },
      token,
    });
  },
};
