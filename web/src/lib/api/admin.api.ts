import { apiFetch } from "@/lib/api/api-fetch";

export type AdminDashboard = {
  /** ผู้ใช้ทั่วไปทั้งหมด (ไม่รวมแอดมิน) ผู้สอนก็นับอยู่ในนี้ด้วย */
  totalUsers: number;
  usersThisMonth: number;
  totalCourses: number;
  publishedCourses: number;
  successfulPayments: number;
  totalRevenue: string;
  revenueThisMonth: string;
  /** 30 วันล่าสุดตามเวลาไทย เรียงจากเก่าไปใหม่ วันที่ไม่มียอดก็มี (เป็น 0) */
  dailyRevenue: { date: string; total: number; count: number }[];
  recentPayments: {
    id: string;
    total: string;
    paymentStatus: AdminPayment["paymentStatus"];
    createdAt: string;
    student: { firstName: string; lastName: string };
  }[];
};

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT";
  isInstructor: boolean;
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
  paymentMethod:
    "FREE" | "CARD" | "PROMPTPAY" | "TRUEMONEY" | "MOBILE_BANKING" | null;
  /** เงินเข้าแล้วแต่คืนผ่าน Opn ไม่ได้ แอดมินต้องโอนคืนเอง */
  manualRefundNeeded: boolean;
  refundReference: string | null;
  purchasedAt: string | null;
  createdAt: string;
  refundedAmount: string;
  refundRequests: { status: "PENDING" | "APPROVED" | "REJECTED" }[];
  student: { firstName: string; lastName: string; email: string };
  purchaseItems: { course: { title: string } }[];
};

export type AdminRefundRequest = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  refundReference: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: { firstName: string; lastName: string } | null;
  student: { firstName: string; lastName: string; email: string };
  /** คอร์สที่ขอคืน (ขอได้ทีละคอร์ส) */
  course: {
    title: string;
    price: string;
    enrollmentStatus: "ACTIVE" | "EXPIRED" | "REFUNDED";
    totalLessons: number;
    completedLessons: number;
  };
  purchase: {
    id: string;
    total: string;
    paymentMethod: AdminPayment["paymentMethod"];
    paymentStatus: AdminPayment["paymentStatus"];
    purchasedAt: string | null;
    courseCount: number;
  };
};

export type FindRefundRequestsResponse = {
  items: AdminRefundRequest[];
  total: number;
  page: number;
  totalPages: number;
  /** จำนวนที่รอพิจารณาทั้งหมด (ไม่ขึ้นกับตัวกรอง) */
  pendingCount: number;
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
      isInstructor?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return apiFetch<FindUsersResponse>(`/admin/users${toQueryString(params)}`, {
      token,
    });
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

  findPayments(
    token: string,
    params: {
      status?: string;
      refundNeeded?: string;
      from?: string;
      to?: string;
      page?: number;
    } = {},
  ) {
    return apiFetch<FindPaymentsResponse>(
      `/admin/payments${toQueryString(params)}`,
      { token },
    );
  },

  refundPurchase(
    purchaseId: string,
    token: string,
    body: { manual?: boolean; reference?: string } = {},
  ) {
    return apiFetch(`/admin/payments/${purchaseId}/refund`, {
      method: "POST",
      body,
      token,
    });
  },

  findRefundRequests(
    token: string,
    params: { status?: string; page?: number } = {},
  ) {
    return apiFetch<FindRefundRequestsResponse>(
      `/admin/refund-requests${toQueryString(params)}`,
      { token },
    );
  },

  approveRefundRequest(
    requestId: string,
    token: string,
    body: { manual?: boolean; reference?: string } = {},
  ) {
    return apiFetch(`/admin/refund-requests/${requestId}/approve`, {
      method: "POST",
      body,
      token,
    });
  },

  rejectRefundRequest(requestId: string, note: string, token: string) {
    return apiFetch(`/admin/refund-requests/${requestId}/reject`, {
      method: "POST",
      body: { note },
      token,
    });
  },

  findAdmins(token: string, params: { search?: string } = {}) {
    return apiFetch<AdminAccount[]>(`/admins${toQueryString(params)}`, {
      token,
    });
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

/**
 * ตารางหลังบ้านแสดงทุกรายการในหน้าเดียว (ค้นหา/กรองฝั่ง API อยู่แล้ว)
 * ดึงหน้าแรกเพื่อรู้จำนวนหน้า แล้วดึงหน้าที่เหลือพร้อมกัน
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; totalPages: number }>,
): Promise<T[]> {
  const first = await fetchPage(1);
  if (first.totalPages <= 1) return first.items;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      fetchPage(index + 2),
    ),
  );
  return first.items.concat(...rest.map((page) => page.items));
}
