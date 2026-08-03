import EditCourseForm from "@/components/features/course/EditCourseForm";
import { CourseApi } from "@/lib/api/course.api";
import { auth } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);
  if (!Number.isInteger(courseId) || courseId < 1) notFound();

  let course: Awaited<ReturnType<typeof CourseApi.findMineOne>>;

  try {
    course = await CourseApi.findMineOne(
      courseId,
      session.user.access_token,
    );
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/instructor/courses"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to My Courses"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">Edit Course</h1>
          <p className="text-sm text-muted-foreground">{course.title}</p>
        </div>
      </div>

      <EditCourseForm course={course} />
    </div>
  );
}
