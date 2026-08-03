import { apiFetch } from "@/lib/api/api-fetch";

export type StudentDashboard = {
  enrolledCount: number;
  completedCount: number;
  hoursLearned: number;
  continueLearning: {
    items: Array<{
      courseId: number;
      title: string;
      thumbnailUrl: string | null;
      progressPercent: number;
    }>;
    total: number;
    page: number;
    totalPages: number;
  };
};

export type InstructorDashboard = {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: string;
  recentEnrollments: {
    items: Array<{
      studentName: string;
      courseTitle: string;
      price: string;
      purchasedAt: string | null;
    }>;
    total: number;
    page: number;
    totalPages: number;
  };
};

export const DashboardApi = {
  getStudent(token: string, params: { page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    const qs = query.toString();

    return apiFetch<StudentDashboard>(
      `/dashboard/student${qs ? `?${qs}` : ""}`,
      { token },
    );
  },

  getInstructor(token: string) {
    return apiFetch<InstructorDashboard>("/dashboard/instructor", { token });
  },
};
