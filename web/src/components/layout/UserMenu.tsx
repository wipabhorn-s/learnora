import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth.action";
import { LogOut } from "lucide-react";
import Link from "next/link";

type Role = "STUDENT" | "ADMIN" | "SUPER_ADMIN";

const DASHBOARD_ROUTES: Record<Role, string> = {
  STUDENT: "/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

export default function UserMenu({
  firstName,
  avatarUrl,
  role,
  isInstructor = false,
}: {
  firstName: string;
  avatarUrl: string | null;
  role: Role;
  isInstructor?: boolean;
}) {
  const dashboardHref = DASHBOARD_ROUTES[role];

  return (
    <div className="flex items-center gap-2">
      {/* ผู้ใช้คนเดียวเป็นได้ทั้งผู้เรียนและผู้สอน จึงต้องมีทางสลับมุมมอง */}
      {isInstructor && role === "STUDENT" && (
        <Link
          href="/instructor/dashboard"
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:block"
        >
          Teaching
        </Link>
      )}

      <Link
        href={dashboardHref}
        aria-label="Open dashboard"
        className="rounded-full outline-none ring-primary focus-visible:ring-2"
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl ?? undefined} alt={firstName} />
          <AvatarFallback>{firstName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <form action={logoutAction}>
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          aria-label="Log Out"
          title="Log Out"
          className="rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={19} />
        </Button>
      </form>
    </div>
  );
}
