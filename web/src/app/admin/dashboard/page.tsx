import RecentPayments from "@/components/features/admin/RecentPayments";
import RevenueChart from "@/components/features/admin/RevenueChart";
import { Page, PageHeader } from "@/components/shared/Page";
import StatCard from "@/components/shared/StatCard";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { formatBaht } from "@/lib/format";
import { BookOpen, DollarSign, Users } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard | Learnora" };

export default async function AdminDashboardPage() {
  const session = await auth();
  const dashboard = await AdminApi.getDashboard(session!.user.access_token);

  return (
    <Page height="fit">
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide overview of users, courses and sales."
      />

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users size={22} />}
          iconClassName="bg-violet-50 text-violet-600"
          label="Users"
          value={dashboard.totalUsers}
          hint={`+${dashboard.usersThisMonth} this month`}
        />
        <StatCard
          icon={<BookOpen size={22} />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Courses"
          value={dashboard.totalCourses}
          hint={`${dashboard.publishedCourses} published`}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Total Revenue"
          value={formatBaht(dashboard.totalRevenue)}
          hint={`${formatBaht(dashboard.revenueThisMonth)} this month`}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <RevenueChart days={dashboard.dailyRevenue} />
        <RecentPayments payments={dashboard.recentPayments} />
      </div>
    </Page>
  );
}
