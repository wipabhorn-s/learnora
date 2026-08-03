import { apiFetch } from "@/lib/api/api-fetch";

export type LessonResponse = {
  id: number;
  courseId: number;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  orderNo: number;
};

export const LessonApi = {
  create(formData: FormData, token: string) {
    return apiFetch<LessonResponse>("/lessons", {
      method: "POST",
      body: formData,
      token,
    });
  },

  update(lessonId: number, formData: FormData, token: string) {
    return apiFetch<LessonResponse>(`/lessons/${lessonId}`, {
      method: "PATCH",
      body: formData,
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
