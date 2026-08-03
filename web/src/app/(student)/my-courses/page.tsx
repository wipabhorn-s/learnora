import CourseThumbnail from "@/components/shared/CourseThumbnail";
import Pagination from "@/components/shared/Pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renewAccessAction } from "@/lib/actions/cart.actions";
import { EnrolledCourse, LearningApi } from "@/lib/api/learning.api";
import { auth } from "@/lib/auth";
import { BookOpen } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "My Courses | Learnora" };

function CourseRow({
  item,
  isExpired,
}: {
  item: EnrolledCourse;
  isExpired: boolean;
}) {
  const status =
    item.progressPercent === 100
      ? "Completed"
      : isExpired
        ? "Expired"
        : "Active";

  return (
    <Card className="gap-0 py-0 transition-shadow hover:shadow-md md:flex-row lg:h-36 xl:h-full">
      <div className="relative h-48 w-full shrink-0 md:h-auto md:min-h-36 md:w-56 lg:h-full lg:min-h-0 xl:w-64">
        <CourseThumbnail
          src={item.course.thumbnailUrl}
          alt={item.course.title}
          className="h-full w-full"
        />
        <span
          className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${
            item.progressPercent === 100
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : isExpired
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug">
            {item.course.title}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {item.course.instructor.firstName} {item.course.instructor.lastName}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen size={15} />
            <span>
              {item.course.lessonCount}{" "}
              {item.course.lessonCount === 1 ? "lesson" : "lessons"}
            </span>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-64 xl:w-72">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Course progress
            </span>
            <span className="font-bold text-primary">
              {item.progressPercent}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-44">
          {isExpired ? (
            <form action={renewAccessAction.bind(null, item.course.id)}>
              <Button
                type="submit"
                variant="outline"
                className="h-11 w-full text-sm font-semibold"
              >
                Renew Access
              </Button>
            </form>
          ) : (
            <Link
              href={`/my-courses/${item.course.id}/player`}
              className={buttonVariants({
                className: "h-11 w-full text-sm font-semibold",
              })}
            >
              {item.progressPercent === 0
                ? "Start Learning"
                : "Continue Learning"}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    activePage?: string;
    expiredPage?: string;
    cartError?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const activePage = Math.max(1, Number(params.activePage) || 1);
  const expiredPage = Math.max(1, Number(params.expiredPage) || 1);
  const { cartError } = params;
  const session = await auth();
  const { active, expired } = await LearningApi.findEnrolledCourses(
    session!.user.access_token,
    { activePage, expiredPage },
  );

  const view = params.view === "expired" ? "expired" : "active";

  if (active.total === 0 && expired.total === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)]">
        <h1 className="mb-7 text-3xl font-extrabold tracking-tight">
          My Courses
        </h1>
        <Card className="min-h-128 flex-1 items-center justify-center gap-0 px-6 py-16 text-center">
          <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
            <BookOpen size={60} className="text-primary/70" />
          </div>
          <h2 className="mb-3 text-2xl font-extrabold">
            You haven&apos;t enrolled in any courses yet
          </h2>
          <p className="mb-8 text-base text-muted-foreground">
            Browse our catalog and start learning today.
          </p>
          <Link
            href="/courses"
            className={buttonVariants({
              className: "h-12 rounded-xl px-9 text-base font-semibold",
            })}
          >
            Browse Courses
          </Link>
        </Card>
      </div>
    );
  }

  const buildPageUrl = (
    key: "activePage" | "expiredPage",
    nextPage: number,
  ) => {
    const query = new URLSearchParams();
    query.set("view", key === "activePage" ? "active" : "expired");

    if (nextPage > 1) query.set(key, String(nextPage));

    const qs = query.toString();
    return `/my-courses${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col gap-6 sm:min-h-[calc(100dvh-3rem)] xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue learning and keep track of your progress.
        </p>
      </div>

      {cartError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cartError}
        </div>
      )}

      <div className="inline-flex h-11 self-start items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        <Link
          href="/my-courses"
          className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
            view === "active"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Active Courses
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none ${
              view === "active"
                ? "bg-white/20 text-white"
                : "bg-secondary text-primary"
            }`}
          >
            {active.total}
          </span>
        </Link>
        <Link
          href="/my-courses?view=expired"
          className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
            view === "expired"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Expired Courses
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none ${
              view === "expired"
                ? "bg-white/20 text-white"
                : "bg-secondary text-primary"
            }`}
          >
            {expired.total}
          </span>
        </Link>
      </div>

      {view === "active" && active.total === 0 && (
        <Card className="min-h-96 flex-1 items-center justify-center gap-0 px-6 py-12 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-secondary">
            <BookOpen size={40} className="text-primary/70" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold">No active courses</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Courses you can currently access will appear here.
          </p>
          <Link href="/courses" className={buttonVariants()}>
            Browse Courses
          </Link>
        </Card>
      )}

      {view === "expired" && expired.total === 0 && (
        <Card className="min-h-96 flex-1 items-center justify-center gap-0 px-6 py-12 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-secondary">
            <BookOpen size={40} className="text-primary/70" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold">No expired courses</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Courses with expired access will appear here.
          </p>
          <Link href="/my-courses" className={buttonVariants()}>
            View Active Courses
          </Link>
        </Card>
      )}

      {view === "active" && active.total > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 xl:grid xl:min-h-0 xl:flex-1 xl:grid-rows-3 xl:gap-3 xl:space-y-0">
            {active.items.map((item) => (
              <CourseRow key={item.id} item={item} isExpired={false} />
            ))}
          </div>
          <div className="mt-auto shrink-0">
            <Pagination
              currentPage={active.page}
              totalPages={active.totalPages}
              getPageHref={(page) => buildPageUrl("activePage", page)}
              ariaLabel="Active course pages"
            />
          </div>
        </div>
      )}

      {view === "expired" && expired.total > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="sr-only">
            Expired Courses
            <span className="text-xs font-normal text-muted-foreground">
              (access ended — renew to continue)
            </span>
          </h2>
          <div className="space-y-3 opacity-80 xl:grid xl:min-h-0 xl:flex-1 xl:grid-rows-3 xl:gap-3 xl:space-y-0">
            {expired.items.map((item) => (
              <CourseRow key={item.id} item={item} isExpired />
            ))}
          </div>
          <div className="mt-auto shrink-0">
            <Pagination
              currentPage={expired.page}
              totalPages={expired.totalPages}
              getPageHref={(page) => buildPageUrl("expiredPage", page)}
              ariaLabel="Expired course pages"
            />
          </div>
        </div>
      )}
    </div>
  );
}
