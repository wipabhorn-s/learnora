"use client";

import Logo from "@/components/shared/Logo";
import { logoutAction } from "@/lib/actions/auth.action";
import {
  BookOpen,
  CreditCard,
  Heart,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ShieldCheck,
  ShoppingCart,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarIconName =
  | "home"
  | "dashboard"
  | "courses"
  | "create-course"
  | "wishlist"
  | "cart"
  | "history"
  | "users"
  | "payments"
  | "admins"
  | "profile";

const ICONS: Record<SidebarIconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  courses: BookOpen,
  "create-course": PlusCircle,
  wishlist: Heart,
  cart: ShoppingCart,
  history: History,
  users: Users,
  payments: CreditCard,
  admins: ShieldCheck,
  profile: User,
};

export type SidebarItem = {
  label: string;
  href: string;
  icon: SidebarIconName;
};

export default function Sidebar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-20 shrink-0 self-start flex-col overflow-hidden border-r border-border bg-card py-6 xl:w-60">
      <div className="mb-8 shrink-0 px-3 xl:px-6">
        <Logo compactOnSmall />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 xl:px-3">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all xl:justify-start ${
                isActive
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={item.label}
            >
              <Icon size={18} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction} className="mt-4 shrink-0 px-2 xl:px-3">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-red-50 hover:text-red-600 xl:justify-start"
          title="Log Out"
        >
          <LogOut size={18} />
          <span className="hidden xl:inline">Log Out</span>
        </button>
      </form>
    </aside>
  );
}
