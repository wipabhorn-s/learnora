import type { SidebarItem } from "@/components/layout/Sidebar";
import type { Workspace } from "@/lib/constants/workspace";

export const WORKSPACE_ITEMS: Record<Workspace, SidebarItem[]> = {
  learn: [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "My Courses", href: "/my-courses", icon: "courses" },
    { label: "Wishlist", href: "/wishlist", icon: "wishlist" },
    { label: "Cart", href: "/cart", icon: "cart" },
    { label: "Purchase History", href: "/purchase-history", icon: "history" },
  ],
  teach: [
    { label: "Dashboard", href: "/instructor/dashboard", icon: "dashboard" },
    { label: "My Courses", href: "/instructor/courses", icon: "courses" },
    {
      label: "Create Course",
      href: "/instructor/courses/new",
      icon: "create-course",
    },
    { label: "Earnings", href: "/instructor/earnings", icon: "earnings" },
  ],
};

/** ข้อมูลบัญชีเป็นของคนคนเดียว ใช้หน้าเดียวกันทั้งสองพื้นที่ */
export const ACCOUNT_ITEMS: SidebarItem[] = [
  { label: "Profile", href: "/profile", icon: "profile" },
];
