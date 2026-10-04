"use client";

import Logo from "@/components/shared/Logo";
import { logoutAction } from "@/lib/actions/auth.action";
import { Workspace, WORKSPACE_HOME } from "@/lib/constants/workspace";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Heart,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Presentation,
  ShieldCheck,
  ShoppingCart,
  Undo2,
  User,
  Users,
  Wallet,
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
  | "refunds"
  | "earnings"
  | "payouts"
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
  refunds: Undo2,
  earnings: Wallet,
  payouts: Landmark,
  admins: ShieldCheck,
  profile: User,
};

export type SidebarItem = {
  label: string;
  href: string;
  icon: SidebarIconName;
};

const WORKSPACES: { key: Workspace; label: string; icon: LucideIcon }[] = [
  { key: "learn", label: "Learn", icon: GraduationCap },
  { key: "teach", label: "Teach", icon: Presentation },
];

const ITEM_CLASS =
  "flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all xl:justify-start";

function NavLink({ item, active }: { item: SidebarItem; active: boolean }) {
  const Icon = ICONS[item.icon];

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${ITEM_CLASS} ${
        active
          ? "bg-secondary text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      title={item.label}
    >
      <Icon size={18} />
      <span className="hidden xl:inline">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({
  items,
  accountItems = [],
  workspace,
}: {
  items: SidebarItem[];
  /** เมนูของบัญชี (เช่น Profile) ติดล่างสุด เหมือนกันทุกพื้นที่ */
  accountItems?: SidebarItem[];
  /** มีเฉพาะฝั่งผู้ใช้ทั่วไป แอดมินไม่มีการสลับพื้นที่ */
  workspace?: { current: Workspace; canTeach: boolean };
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-20 shrink-0 self-start flex-col overflow-hidden border-r border-border bg-card py-6 xl:w-60">
      <div className="mb-6 shrink-0 px-3 xl:px-6">
        <Logo compactOnSmall />
      </div>

      {/* สวิตช์อยู่ตำแหน่งเดิมทั้งสองพื้นที่ กดครั้งเดียวสลับได้ทั้งไปและกลับ */}
      {workspace?.canTeach && (
        <nav
          aria-label="Switch workspace"
          className="mb-6 shrink-0 px-2 xl:px-3"
        >
          <div className="grid gap-1 rounded-xl bg-muted p-1 xl:grid-cols-2">
            {WORKSPACES.map(({ key, label, icon: Icon }) => {
              const active = workspace.current === key;

              return (
                <Link
                  key={key}
                  href={WORKSPACE_HOME[key]}
                  aria-current={active ? "page" : undefined}
                  title={`${label} mode`}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 xl:px-3">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="mt-4 shrink-0 space-y-1 border-t border-border px-2 pt-4 xl:px-3">
        {/* ยังไม่ได้เปิดสิทธิ์สอน: ชวนไปหน้าอธิบายแทนการซ่อนไว้ในหน้า settings */}
        {workspace && !workspace.canTeach && (
          <Link
            href="/teach"
            aria-current={pathname === "/teach" ? "page" : undefined}
            className={`${ITEM_CLASS} ${
              pathname === "/teach"
                ? "bg-secondary text-primary"
                : "text-primary hover:bg-secondary"
            }`}
            title="Start teaching"
          >
            <Presentation size={18} />
            <span className="hidden xl:inline">Start teaching</span>
          </Link>
        )}

        {accountItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}

        <form action={logoutAction}>
          <button
            type="submit"
            className={`${ITEM_CLASS} text-muted-foreground hover:bg-red-50 hover:text-red-600`}
            title="Log Out"
          >
            <LogOut size={18} />
            <span className="hidden xl:inline">Log Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
