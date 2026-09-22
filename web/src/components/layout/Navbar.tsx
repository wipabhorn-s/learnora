import { Button } from "@/components/ui/button";
import Logo from "@/components/shared/Logo";
import MobileNav from "@/components/layout/MobileNav";
import SearchBar from "@/components/layout/SearchBar";
import UserMenu from "@/components/layout/UserMenu";
import { CartApi } from "@/lib/api/cart.api";
import { auth } from "@/lib/auth";
import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;
  let cartCount = 0;
  const profileHref =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
      ? "/admin/profile"
      : "/profile";

  if (user?.role === "STUDENT") {
    try {
      const cart = await CartApi.findAll(user.access_token);
      cartCount = cart.items.length;
    } catch {
      // Keep the navigation usable if a count request temporarily fails.
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Logo />

        <nav className="ml-2 hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <Link
            href="/courses"
            className="transition-colors hover:text-primary"
          >
            Courses
          </Link>
          {!user && (
            <Link
              href="/signup?role=INSTRUCTOR"
              className="transition-colors hover:text-primary"
            >
              Become an Instructor
            </Link>
          )}
        </nav>

        <div className="ml-2 hidden flex-1 md:flex">
          <Suspense
            fallback={<div className="h-9 w-full max-w-xs rounded-xl bg-muted" />}
          >
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {user.role === "STUDENT" && (
                <>
                  <NavIconLink href="/wishlist" label="Wishlist">
                    <Heart size={20} />
                  </NavIconLink>
                  <NavIconLink href="/cart" label="Cart" count={cartCount}>
                    <ShoppingCart size={20} />
                  </NavIconLink>
                </>
              )}
              <UserMenu
                firstName={user.firstName}
                avatarUrl={user.avatarUrl}
                role={user.role}
                isInstructor={user.isInstructor}
              />
            </>
          ) : (
            <>
              <Button
                nativeButton={false}
                variant="ghost"
                render={<Link href="/login">Log In</Link>}
              />
              <Button
                nativeButton={false}
                render={<Link href="/signup">Sign Up</Link>}
              />
            </>
          )}
        </div>

        <div className="ml-auto">
          <MobileNav
            isLoggedIn={!!user}
            isStudent={user?.role === "STUDENT"}
            cartCount={cartCount}
            profileHref={profileHref}
          />
        </div>
      </div>
    </header>
  );
}

function NavIconLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={
        count === undefined
          ? label
          : `${label}: ${count} ${count === 1 ? "course" : "courses"}`
      }
      className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
