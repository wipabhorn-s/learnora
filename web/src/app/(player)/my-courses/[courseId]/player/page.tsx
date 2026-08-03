import CoursePlayer from "@/components/features/learning/CoursePlayer";
import { ApiError } from "@/lib/api/api-error";
import { LearningApi } from "@/lib/api/learning.api";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);
  if (!Number.isInteger(courseId)) notFound();

  let data;
  try {
    data = await LearningApi.getPlayer(courseId, session.user.access_token);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.statusCode === 404 || error.statusCode === 403)
    ) {
      redirect("/my-courses");
    }
    throw error;
  }

  return <CoursePlayer data={data} />;
}
