import { apiFetch } from "@/lib/api/api-fetch";

export type AdminDashboard = {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalRevenue: string;
};

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR";
  status: boolean;
  createdAt: string;
};

export type FindUsersResponse = {
  items: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminCourse = {
  id: number;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "DELETED";
  price: string;
  createdAt: string;
  instructor: { firstName: string; lastName: string };
  _count: { purchaseItems: number };
};

export type FindAdminCoursesResponse = {
  items: AdminCourse[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminPayment = {
  id: string;
  total: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  purchasedAt: string | null;
  createdAt: string;
  student: { firstName: string; lastName: string; email: string };
  purchaseItems: { course: { title: string } }[];
};

export type FindPaymentsResponse = {
  items: AdminPayment[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: boolean;
  createdAt: string;
};

export type CreateAdminInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function toQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const AdminApi = {
  getDashboard(token: string) {
    return apiFetch<AdminDashboard>("/admin/dashboard", { token });
  },

  findUsers(
    token: string,
    params: {
      search?: string;
      role?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return apiFetch<FindUsersResponse>(
      `/admin/users${toQueryString(params)}`,
      { token },
    );
  },

  updateUserStatus(userId: string, token: string) {
    return apiFetch<{ id: string; status: boolean }>(
      `/admin/users/${userId}/status`,
      { method: "PATCH", token },
    );
  },

  findCourses(
    token: string,
    params: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return apiFetch<FindAdminCoursesResponse>(
      `/admin/courses${toQueryString(params)}`,
      { token },
    );
  },

  updateCourseStatus(courseId: number, token: string) {
    return apiFetch<{ id: number; status: string }>(
      `/admin/courses/${courseId}/status`,
      { method: "PATCH", token },
    );
  },

  findPayments(token: string, params: { status?: string; page?: number } = {}) {
    return apiFetch<FindPaymentsResponse>(
      `/admin/payments${toQueryString(params)}`,
      { token },
    );
  },

  refundPurchase(purchaseId: string, token: string) {
    return apiFetch(`/admin/payments/${purchaseId}/refund`, {
      method: "POST",
      token,
    });
  },

  findAdmins(token: string) {
    return apiFetch<AdminAccount[]>("/admins", { token });
  },

  createAdmin(data: CreateAdminInput, token: string) {
    return apiFetch<AdminAccount>("/admins", {
      method: "POST",
      body: data,
      token,
    });
  },

  updateAdminStatus(adminId: string, token: string) {
    return apiFetch<{ id: string; status: boolean }>(
      `/admins/${adminId}/status`,
      { method: "PATCH", token },
    );
  },
};
