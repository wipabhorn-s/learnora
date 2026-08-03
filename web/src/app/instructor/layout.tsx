import Sidebar, { SidebarItem } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/instructor/dashboard",
    icon: "dashboard",
  },
  {
    label: "My Courses",
    href: "/instructor/courses",
    icon: "courses",
  },
  {
    label: "Create Course",
    href: "/instructor/courses/new",
    icon: "create-course",
  },
  {
    label: "Profile",
    href: "/instructor/profile",
    icon: "profile",
  },
];

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "INSTRUCTOR") redirect("/");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={ITEMS} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
