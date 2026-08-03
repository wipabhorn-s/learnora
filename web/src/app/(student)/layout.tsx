import Sidebar, { SidebarItem } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "My Courses",
    href: "/my-courses",
    icon: "courses",
  },
  {
    label: "Wishlist",
    href: "/wishlist",
    icon: "wishlist",
  },
  {
    label: "Cart",
    href: "/cart",
    icon: "cart",
  },
  {
    label: "Purchase History",
    href: "/purchase-history",
    icon: "history",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "profile",
  },
];
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={ITEMS} />
      <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 xl:p-8">
        {children}
      </main>
    </div>
  );
}
