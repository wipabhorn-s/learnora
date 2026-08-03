import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth.action";
import { LogOut } from "lucide-react";
import Link from "next/link";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";

const DASHBOARD_ROUTES: Record<Role, string> = {
  STUDENT: "/dashboard",
  INSTRUCTOR: "/instructor/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

export default function UserMenu({
  firstName,
  avatarUrl,
  role,
}: {
  firstName: string;
  avatarUrl: string | null;
  role: Role;
}) {
  const dashboardHref = DASHBOARD_ROUTES[role];

  return (
    <div className="flex items-center gap-2">
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
