import StatCard from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  DollarSign,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Dashboard | Learnora" };

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const dashboard = await AdminApi.getDashboard(session!.user.access_token);

  const totalAccounts = dashboard.totalStudents + dashboard.totalInstructors;
  const studentShare = percentage(dashboard.totalStudents, totalAccounts);
  const instructorShare = percentage(dashboard.totalInstructors, totalAccounts);
  const revenue = Number(dashboard.totalRevenue);
  const averageRevenuePerCourse =
    dashboard.totalCourses === 0 ? 0 : revenue / dashboard.totalCourses;

  const quickActions = [
    {
      label: "Manage Users",
      description: "Review student and instructor accounts.",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Review Courses",
      description: "Check course status and moderation.",
      href: "/admin/courses",
      icon: BookOpen,
    },
    {
      label: "View Payments",
      description: "Monitor payments and refunds.",
      href: "/admin/payments",
      icon: CreditCard,
    },
    ...(session!.user.role === "SUPER_ADMIN"
      ? [
          {
            label: "Manage Admins",
            description: "Create and manage admin accounts.",
            href: "/admin/admins",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide overview and management shortcuts.
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={22} />}
          iconClassName="bg-violet-50 text-violet-600"
          label="Students"
          value={dashboard.totalStudents}
        />
        <StatCard
          icon={<GraduationCap size={22} />}
          iconClassName="bg-amber-50 text-amber-600"
          label="Instructors"
          value={dashboard.totalInstructors}
        />
        <StatCard
          icon={<BookOpen size={22} />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Courses"
          value={dashboard.totalCourses}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Total Revenue"
          value={`฿${revenue.toLocaleString()}`}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card className="min-h-0 gap-0 p-6">
          <div className="shrink-0">
            <h2 className="text-lg font-bold">Platform Insights</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick view of account distribution and platform value.
            </p>
          </div>

          <div className="mt-6 grid flex-1 content-center gap-5 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-5">
              <p className="text-sm text-muted-foreground">Total accounts</p>
              <p className="mt-2 text-3xl font-extrabold">
                {totalAccounts.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Students and instructors combined
              </p>
            </div>

            <div className="rounded-xl bg-muted/60 p-5">
              <p className="text-sm text-muted-foreground">
                Average revenue per course
              </p>
              <p className="mt-2 text-3xl font-extrabold text-primary">
                ฿{Math.round(averageRevenuePerCourse).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on current total revenue
              </p>
            </div>

            <div className="space-y-4 rounded-xl border p-5 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Community mix</span>
                <span className="text-xs text-muted-foreground">
                  {totalAccounts.toLocaleString()} accounts
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Students</span>
                  <span>{studentShare}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${studentShare}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Instructors</span>
                  <span>{instructorShare}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${instructorShare}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="min-h-0 gap-0 p-6">
          <div className="shrink-0">
            <h2 className="text-lg font-bold">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump directly to common administration tasks.
            </p>
          </div>

          <div className="mt-5 grid min-h-0 flex-1 content-center gap-3 overflow-y-auto pr-1">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "h-auto min-h-16 w-full justify-start gap-3 px-4 py-3 text-left",
                  })}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{action.label}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowUpRight className="text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
