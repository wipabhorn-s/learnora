import CoursePlayer from "@/components/features/learning/CoursePlayer";
import { ApiError } from "@/lib/api/api-error";
import { CourseApi } from "@/lib/api/course.api";
import type { PlayerResponse } from "@/lib/api/learning.api";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function InstructorCoursePlayerPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "INSTRUCTOR") redirect("/");

  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);
  if (!Number.isInteger(courseId) || courseId < 1) notFound();

  let data: PlayerResponse;

  try {
    const course = await CourseApi.findMineOne(
      courseId,
      session.user.access_token,
    );
    data = {
      course: { id: course.id, title: course.title },
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        progress: {
          lastPositionSeconds: 0,
          maxWatchedSeconds: 0,
          isCompleted: false,
        },
      })),
    };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.statusCode === 403 || error.statusCode === 404)
    ) {
      redirect("/instructor/courses");
    }
    throw error;
  }

  return (
    <CoursePlayer
      data={data}
      trackProgress={false}
      backHref="/instructor/courses"
    />
  );
}
