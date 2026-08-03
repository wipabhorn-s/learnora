import Sidebar, { type SidebarItem } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const ADMIN_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "dashboard",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "users",
  },
  {
    label: "Courses",
    href: "/admin/courses",
    icon: "courses",
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: "payments",
  },
];

const PROFILE_ITEM: SidebarItem = {
  label: "Profile",
  href: "/admin/profile",
  icon: "profile",
};

const SUPER_ADMIN_ITEMS: SidebarItem[] = [
  {
    label: "Manage Admins",
    href: "/admin/admins",
    icon: "admins",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  const role = session.user.role;

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const items: SidebarItem[] = [
    ...ADMIN_ITEMS,
    ...(role === "SUPER_ADMIN" ? SUPER_ADMIN_ITEMS : []),
    PROFILE_ITEM,
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={items} />

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
