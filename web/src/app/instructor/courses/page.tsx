import CourseRowActions from "@/components/features/course/CourseRowActions";
import CourseStatusControl from "@/components/features/course/CourseStatusControl";
import Pagination from "@/components/shared/Pagination";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseApi } from "@/lib/api/course.api";
import { auth } from "@/lib/auth";
import { BookOpen, Plus } from "lucide-react";
import Image from "next/image";
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
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">My Courses</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your published and draft courses
          </p>
        </div>

        <Link
          href="/instructor/courses/new"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus />
          Create Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card className="min-h-128 flex-1 items-center justify-center gap-0 px-6 py-16 text-center">
          <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
            <BookOpen size={60} className="text-primary/70" />
          </div>
          <h2 className="mb-3 text-2xl font-extrabold">No courses yet</h2>
          <p className="mb-8 text-base text-muted-foreground">
            Create your first course to get started.
          </p>
          <Link
            href="/instructor/courses/new"
            className={buttonVariants({
              className: "h-12 rounded-xl px-9 text-base font-semibold",
            })}
          >
            <Plus />
            Create Course
          </Link>
        </Card>
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
                          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <Image
                              src={course.thumbnailUrl ?? "/course.png"}
                              alt={course.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <span className="line-clamp-2 font-semibold">
                            {course.title}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {course.category
                          .replaceAll("_", " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {Number(course.price) === 0
                          ? "Free"
                          : `฿${Number(course.price).toLocaleString()}`}
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
    </div>
  );
}
