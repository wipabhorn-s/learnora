import CourseThumbnail from "@/components/shared/CourseThumbnail";
import Pagination from "@/components/shared/Pagination";
import StatCard from "@/components/shared/StatCard";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardApi } from "@/lib/api/dashboard.api";
import { auth } from "@/lib/auth";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard | Learnora" };

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await auth();
  const dashboard = await DashboardApi.getStudent(session!.user.access_token, {
    page,
  });
  const greeting = getGreeting();
  const activeCourseLabel =
    dashboard.enrolledCount === 1 ? "active course" : "active courses";
  const learningMessage =
    dashboard.enrolledCount === 0
      ? "You have no active courses yet. Explore courses and start learning!"
      : `You have ${dashboard.enrolledCount} ${activeCourseLabel}. Keep going!`;

  const buildPageUrl = (nextPage: number) =>
    nextPage === 1 ? "/dashboard" : `/dashboard?page=${nextPage}`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col gap-6 sm:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting}, {session!.user.firstName} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{learningMessage}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookOpen size={22} />}
          iconClassName="bg-violet-50 text-violet-600"
          label="Enrolled Courses"
          value={dashboard.enrolledCount}
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Completed Courses"
          value={dashboard.completedCount}
        />
        <StatCard
          icon={<Clock size={22} />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Hours Learned"
          value={dashboard.hoursLearned}
        />
      </div>

      <div className="flex flex-1 flex-col">
        <h2 className="mb-4 text-lg font-bold">Continue Learning</h2>

        {dashboard.continueLearning.items.length > 0 ? (
          <div className="flex flex-1 flex-col">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.continueLearning.items.map((course) => (
                <Card
                  key={course.courseId}
                  className="h-full gap-0 overflow-hidden py-0"
                >
                  <CourseThumbnail
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-36 w-full shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                    <div>
                      <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-snug">
                        {course.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${course.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          {course.progressPercent}%
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/my-courses/${course.courseId}/player`}
                      className={buttonVariants({
                        className: "mt-auto h-10 w-full",
                      })}
                    >
                      Continue Learning
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-auto">
              <Pagination
                currentPage={dashboard.continueLearning.page}
                totalPages={dashboard.continueLearning.totalPages}
                getPageHref={buildPageUrl}
                ariaLabel="Continue learning pages"
              />
            </div>
          </div>
        ) : (
          <Card className="min-h-80 flex-1 items-center justify-center gap-3 p-8 text-center">
            <BookOpen size={36} className="text-muted-foreground" />
            <p className="font-semibold">
              {dashboard.enrolledCount === 0
                ? "You haven't enrolled in any courses yet"
                : "You've completed all your active courses!"}
            </p>
            <Link href="/courses" className={buttonVariants()}>
              Browse Courses
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
