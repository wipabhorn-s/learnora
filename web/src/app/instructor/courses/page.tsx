import CourseRowActions from "@/components/features/course/CourseRowActions";
import CourseStatusControl from "@/components/features/course/CourseStatusControl";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import EmptyState from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import Pagination from "@/components/shared/Pagination";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseApi } from "@/lib/api/course.api";
import { auth } from "@/lib/auth";
import { formatEnum, formatPrice } from "@/lib/format";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const COURSES_PER_PAGE = 6;

export default async function InstructorCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const courses = await CourseApi.findMine(session.user.access_token);
  const totalPages = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE));
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const page = Math.min(requestedPage, totalPages);
  const visibleCourses = courses.slice(
    (page - 1) * COURSES_PER_PAGE,
    page * COURSES_PER_PAGE,
  );

  const buildPageUrl = (nextPage: number) =>
    nextPage === 1
      ? "/instructor/courses"
      : `/instructor/courses?page=${nextPage}`;

  return (
    <Page height="fit">
      <PageHeader title="My Courses">
        {/* ยังไม่มีคอร์ส ปุ่มสร้างอยู่กลางการ์ดว่างอยู่แล้ว ไม่ต้องมีซ้ำด้านบน */}
        {courses.length > 0 && (
          <Link
            href="/instructor/courses/new"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus />
            Create Course
          </Link>
        )}
      </PageHeader>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to get started."
          action={{
            label: "Create Course",
            href: "/instructor/courses/new",
            icon: Plus,
          }}
          className="min-h-128"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0 shadow-sm">
            <div className="h-full overflow-auto px-6">
              <table className="w-full min-w-3xl border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-xs font-bold tracking-wide text-muted-foreground">
                    <th className="py-3 pr-6">COURSE</th>
                    <th className="px-4 py-3">CATEGORY</th>
                    <th className="px-4 py-3">PRICE</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="py-3 pl-4 text-center">ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleCourses.map((course) => (
                    <tr key={course.id} className="border-b last:border-0">
                      <td className="py-3 pr-6">
                        <div className="flex min-w-72 items-center gap-4">
                          <CourseThumbnail
                            src={course.thumbnailUrl}
                            alt={course.title}
                            sizes="80px"
                            className="h-12 w-20 shrink-0 rounded-xl"
                          />
                          <span className="line-clamp-2 font-semibold">
                            {course.title}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatEnum(course.category)}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {formatPrice(course.price)}
                      </td>

                      <td className="px-4 py-3">
                        <CourseStatusControl
                          courseId={course.id}
                          status={course.status}
                        />
                      </td>

                      <td className="py-3 pl-4">
                        <CourseRowActions
                          courseId={course.id}
                          courseTitle={course.title}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-auto shrink-0">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              getPageHref={buildPageUrl}
              ariaLabel="Instructor course pages"
            />
          </div>
        </div>
      )}
    </Page>
  );
}
