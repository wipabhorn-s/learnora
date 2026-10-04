import CourseBuilder from "@/components/features/course/CourseBuilder";
import CoursePageHeader from "@/components/features/course/CoursePageHeader";
import { CourseApi } from "@/lib/api/course.api";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { notFound, redirect, unstable_rethrow } from "next/navigation";

export const metadata: Metadata = { title: "Edit Course | Learnora" };

/** ขั้นที่ 2 จาก 2: บทเรียน รายละเอียด และการเผยแพร่ อยู่ในหน้าเดียว */
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
    course = await CourseApi.findMineOne(courseId, session.user.access_token);
  } catch (error) {
    unstable_rethrow(error);
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CoursePageHeader title={course.title} />
      <CourseBuilder course={course} />
    </div>
  );
}
