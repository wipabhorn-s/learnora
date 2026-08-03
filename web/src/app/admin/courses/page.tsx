import AdminFilters from "@/components/features/admin/AdminFilters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateCourseStatusAction } from "@/lib/actions/admin.action";
import { AdminApi, type AdminCourse } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { BookOpen } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Courses | Learnora Admin" };

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUSPENDED: "border-red-200 bg-red-50 text-red-700",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  DELETED: "border-slate-200 bg-slate-50 text-slate-700",
};

async function findAllCourses(
  token: string,
  filters: { search?: string; status?: string },
) {
  const firstPage = await AdminApi.findCourses(token, {
    ...filters,
    page: 1,
    limit: 50,
  });

  if (firstPage.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      AdminApi.findCourses(token, {
        ...filters,
        page: index + 2,
        limit: 50,
      }),
    ),
  );

  return remainingPages.reduce<AdminCourse[]>(
    (items, page) => items.concat(page.items),
    firstPage.items,
  );
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const courses = await findAllCourses(session!.user.access_token, {
    search: params.search,
    status: params.status,
  });

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and moderate every course on the platform.
        </p>
      </div>

      {params.error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminFilters
          className="min-w-0 flex-1"
          searchPlaceholder="Search by course title..."
          filterGroups={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "DELETED", label: "Deleted" },
              ],
            },
          ]}
        />
        <span className="shrink-0 self-start text-sm text-muted-foreground sm:self-auto sm:pr-1">
          <span className="font-semibold text-foreground">
            {courses.length}
          </span>{" "}
          {courses.length === 1 ? "course" : "courses"}
        </span>
      </div>

      <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
        {courses.length > 0 ? (
          <div className="h-full overflow-auto">
            <div className="min-w-[900px]">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(18rem,1.8fr)_8rem_8rem_8rem_7rem] items-center gap-4 border-b bg-muted/90 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                <span>Course</span>
                <span className="text-right">Price</span>
                <span className="text-center">Students</span>
                <span className="text-center">Status</span>
                <span className="text-center">Action</span>
              </div>

              <div className="divide-y">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="grid min-h-18 grid-cols-[minmax(18rem,1.8fr)_8rem_8rem_8rem_7rem] items-center gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {course.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {course.instructor.firstName} {course.instructor.lastName}
                      </p>
                    </div>

                    <span className="text-right text-sm font-bold text-primary">
                      {Number(course.price) === 0
                        ? "Free"
                        : `฿${Number(course.price).toLocaleString()}`}
                    </span>

                    <span className="text-center text-sm text-muted-foreground">
                      {course._count.purchaseItems}
                    </span>

                    <span
                      className={`inline-flex h-7 w-24 items-center justify-center justify-self-center rounded-full border text-xs font-semibold ${STATUS_STYLE[course.status]}`}
                    >
                      {course.status}
                    </span>

                    <div className="flex justify-center">
                      {(course.status === "PUBLISHED" ||
                        course.status === "SUSPENDED") && (
                        <form
                          action={updateCourseStatusAction.bind(null, course.id)}
                        >
                          <Button
                            type="submit"
                            variant={
                              course.status === "PUBLISHED"
                                ? "destructive"
                                : "outline"
                            }
                            size="sm"
                            className="w-24 font-semibold"
                          >
                            {course.status === "PUBLISHED"
                              ? "Suspend"
                              : "Unsuspend"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-96 flex-col items-center justify-center gap-3 p-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
              <BookOpen size={38} className="text-primary/70" />
            </div>
            <p className="text-lg font-bold">No courses found</p>
            <p className="text-sm text-muted-foreground">
              Try changing the search or status filter.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
