import StatCard from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { DashboardApi } from "@/lib/api/dashboard.api";
import { auth } from "@/lib/auth";
import { BookOpen, DollarSign, Users } from "lucide-react";
import { Metadata } from "next";

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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function InstructorDashboardPage() {
  const session = await auth();
  const dashboard = await DashboardApi.getInstructor(
    session!.user.access_token,
  );
  const greeting = getGreeting();
  const enrollments = dashboard.recentEnrollments.items;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting}, {session!.user.firstName} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Here&apos;s how your courses are performing.
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookOpen size={22} />}
          iconClassName="bg-violet-50 text-violet-600"
          label="Total Courses"
          value={dashboard.totalCourses}
        />
        <StatCard
          icon={<Users size={22} />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Total Students"
          value={dashboard.totalStudents}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Total Revenue"
          value={`฿${Number(dashboard.totalRevenue).toLocaleString()}`}
        />
      </div>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">Recent Enrollments</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            {dashboard.recentEnrollments.total} total
          </span>
        </div>

        <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
          {enrollments.length > 0 ? (
            <>
              <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_7rem_8rem] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Student</span>
                <span>Course</span>
                <span className="text-right">Price</span>
                <span className="text-right">Enrolled</span>
              </div>
              <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                {enrollments.map((item, index) => (
                  <div
                    key={`${item.studentName}-${item.courseTitle}-${index}`}
                    className="grid min-h-16 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_7rem_8rem] items-center gap-4 px-5 py-3"
                  >
                    <p className="truncate text-sm font-semibold">
                      {item.studentName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.courseTitle}
                    </p>
                    <p className="text-right text-sm font-bold text-primary">
                      {Number(item.price) === 0
                        ? "Free"
                        : `฿${Number(item.price).toLocaleString()}`}
                    </p>
                    <p className="text-right text-xs text-muted-foreground">
                      {formatDate(item.purchasedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
                <Users size={38} className="text-primary/70" />
              </div>
              <p className="text-lg font-bold">No enrollments yet</p>
              <p className="text-sm text-muted-foreground">
                New student enrollments will appear here.
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
