"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth.action";
import { Heart, LogOut, Menu, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function MobileNav({
  isLoggedIn,
  isStudent,
  cartCount,
  profileHref,
}: {
  isLoggedIn: boolean;
  isStudent: boolean;
  cartCount: number;
  profileHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground"
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 space-y-3 border-t border-border bg-white px-6 py-4">
          <Link
            href="/"
            className="block py-1 text-sm font-medium text-muted-foreground"
          >
            Home
          </Link>
          <Link
            href="/courses"
            className="block py-1 text-sm font-medium text-muted-foreground"
          >
            Courses
          </Link>
          {isStudent && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/wishlist"
                className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <Heart size={17} /> Wishlist
                </span>
              </Link>
              <Link
                href="/cart"
                className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={17} /> Cart
                </span>
                <CountBadge count={cartCount} />
              </Link>
            </div>
          )}
          {isLoggedIn && (
            <div className="space-y-2 border-t border-border pt-3">
              <Link
                href={profileHref}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <User size={17} /> Profile
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={17} /> Log Out
                </button>
              </form>
            </div>
          )}
          {!isLoggedIn && (
            <div className="flex gap-3 pt-2">
              <Button
                nativeButton={false}
                variant="outline"
                className="flex-1"
                render={<Link href="/login">Log In</Link>}
              />
              <Button
                nativeButton={false}
                className="flex-1"
                render={<Link href="/signup">Sign Up</Link>}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
