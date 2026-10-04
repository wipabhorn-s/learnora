import EmptyState from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import StatCard from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { DashboardApi } from "@/lib/api/dashboard.api";
import { auth } from "@/lib/auth";
import { formatBaht, formatDate, formatPrice, greeting } from "@/lib/format";
import { BookOpen, DollarSign, Users } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard | Learnora" };

export default async function InstructorDashboardPage() {
  const session = await auth();
  const dashboard = await DashboardApi.getInstructor(
    session!.user.access_token,
  );

  const enrollments = dashboard.recentEnrollments.items;

  return (
    <Page height="fit">
      <PageHeader
        title={`${greeting()}, ${session!.user.firstName} 👋`}
        description="Here's how your courses are performing."
      />

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
          value={formatBaht(dashboard.totalRevenue)}
        />
      </div>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">Recent Enrollments</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            {dashboard.recentEnrollments.total} total
          </span>
        </div>

        {enrollments.length > 0 ? (
          <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
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
                    {formatPrice(item.price)}
                  </p>
                  <p className="text-right text-xs text-muted-foreground">
                    {formatDate(item.purchasedAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Users}
            title="No enrollments yet"
            description="New student enrollments will appear here."
            className="min-h-80"
          />
        )}
      </section>
    </Page>
  );
}
