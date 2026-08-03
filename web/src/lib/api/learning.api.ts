import { apiFetch } from "@/lib/api/api-fetch";

export type EnrolledCourse = {
  id: string;
  expiresAt: string | null;
  enrollmentStatus: "ACTIVE" | "EXPIRED" | "REFUNDED";
  progressPercent: number;
  course: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    instructor: { firstName: string; lastName: string };
    lessonCount: number;
  };
};

type EnrolledCoursePage = {
  items: EnrolledCourse[];
  total: number;
  page: number;
  totalPages: number;
};

export type EnrolledCoursesResponse = {
  active: EnrolledCoursePage;
  expired: EnrolledCoursePage;
};

export type LessonProgress = {
  lastPositionSeconds: number;
  maxWatchedSeconds: number;
  isCompleted: boolean;
};

export type PlayerLesson = {
  id: number;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  orderNo: number;
  progress: LessonProgress;
};

export type PlayerResponse = {
  course: { id: number; title: string };
  lessons: PlayerLesson[];
};

export const LearningApi = {
  findEnrolledCourses(
    token: string,
    params: { activePage?: number; expiredPage?: number } = {},
  ) {
    const query = new URLSearchParams();
    if (params.activePage) {
      query.set("activePage", String(params.activePage));
    }
    if (params.expiredPage) {
      query.set("expiredPage", String(params.expiredPage));
    }
    const qs = query.toString();

    return apiFetch<EnrolledCoursesResponse>(
      `/my-courses${qs ? `?${qs}` : ""}`,
      { token },
    );
  },

  getPlayer(courseId: number, token: string) {
    return apiFetch<PlayerResponse>(`/my-courses/${courseId}/player`, {
      token,
    });
  },

  updateProgress(lessonId: number, lastPositionSeconds: number, token: string) {
    return apiFetch<LessonProgress>(
      `/my-courses/lessons/${lessonId}/progress`,
      {
        method: "PATCH",
        body: { lastPositionSeconds },
        token,
      },
    );
  },
};
