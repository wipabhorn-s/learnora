import { apiFetch } from "@/lib/api/api-fetch";
import type { LessonResponse } from "@/lib/api/lesson.api";

export type CourseResponse = {
  id: number;
  title: string;
  description: string;
  price: string;
  category: string;
  level: string;
  accessType: "LIFETIME" | "LIMITED";
  accessDuration: number | null;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "DELETED";
  createdAt: string;
  instructor: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export type LessonSummary = {
  id: number;
  title: string;
  durationSeconds: number;
  orderNo: number;
};

export type FindCoursesResponse = {
  courses: CourseResponse[];
  total: number;
  page: number;
  totalPages: number;
};

export type FindCoursesParams = {
  search?: string;
  category?: string;
  level?: string;
  accessType?: string;
  page?: number;
};

export type MyCourseResponse = Omit<CourseResponse, "instructor"> & {
  updatedAt: string;
};

export type InstructorCourseResponse = MyCourseResponse & {
  lessons: LessonResponse[];
};

export const CourseApi = {
  findAll(params: FindCoursesParams = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, String(value));
    });
    const qs = query.toString();
    return apiFetch<FindCoursesResponse>(`/courses${qs ? `?${qs}` : ""}`);
  },

  findOne(courseId: number) {
    return apiFetch<CourseResponse & { lessons: LessonSummary[] }>(
      `/courses/${courseId}`,
    );
  },

  create(formData: FormData, token: string) {
    return apiFetch<{ id: number }>("/courses", {
      method: "POST",
      body: formData,
      token,
    });
  },

  findMine(token: string) {
    return apiFetch<MyCourseResponse[]>("/courses/mine", {
      token,
    });
  },

  findMineOne(courseId: number, token: string) {
    return apiFetch<InstructorCourseResponse>(`/courses/mine/${courseId}`, {
      token,
    });
  },

  update(courseId: number, formData: FormData, token: string) {
    return apiFetch<MyCourseResponse>(`/courses/${courseId}`, {
      method: "PATCH",
      body: formData,
      token,
    });
  },

  updateStatus(
    courseId: number,
    status: "DRAFT" | "PUBLISHED",
    token: string,
  ) {
    return apiFetch<MyCourseResponse>(`/courses/${courseId}/status`, {
      method: "PATCH",
      body: { status },
      token,
    });
  },

  remove(courseId: number, token: string) {
    return apiFetch<{ message: string }>(`/courses/${courseId}`, {
      method: "DELETE",
      token,
    });
  },
};
