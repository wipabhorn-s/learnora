import { apiFetch } from "@/lib/api/api-fetch";
import { CourseResponse } from "@/lib/api/course.api";

export type WishlistItem = {
  id: string;
  createdAt: string;
  isAvailable: boolean;
  course: CourseResponse;
};

export type WishlistResponse = {
  items: WishlistItem[];
  total: number;
  page: number;
  totalPages: number;
};

type FindWishlistParams = {
  page?: number;
  limit?: number;
};

export const WishlistApi = {
  findAll(token: string, params: FindWishlistParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const qs = query.toString();

    return apiFetch<WishlistResponse>(`/wishlist${qs ? `?${qs}` : ""}`, {
      token,
    });
  },

  findCourseIds(token: string) {
    return apiFetch<number[]>("/wishlist/course-ids", { token });
  },

  add(courseId: number, token: string) {
    return apiFetch<{ message: string }>("/wishlist", {
      method: "POST",
      body: { courseId },
      token,
    });
  },

  remove(courseId: number, token: string) {
    return apiFetch<{ message: string }>(`/wishlist/${courseId}`, {
      method: "DELETE",
      token,
    });
  },
};
