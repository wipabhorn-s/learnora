import { apiFetch } from "@/lib/api/api-fetch";
import { CourseResponse } from "@/lib/api/course.api";

export type CartItem = {
  id: string;
  createdAt: string;
  isAvailable: boolean;
  course: CourseResponse;
};

export type CartResponse = {
  items: CartItem[];
  total: string; // ⚠️ Decimal → string
};

export const CartApi = {
  findAll(token: string) {
    return apiFetch<CartResponse>("/cart", { token });
  },

  add(courseId: number, token: string) {
    return apiFetch<{ message: string }>("/cart", {
      method: "POST",
      body: { courseId },
      token,
    });
  },

  remove(courseId: number, token: string) {
    return apiFetch<{ message: string }>(`/cart/${courseId}`, {
      method: "DELETE",
      token,
    });
  },
};
