import CourseCard from "@/components/features/course/CourseCard";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CartApi } from "@/lib/api/cart.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { Heart } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Wishlist | Learnora" };

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await auth();
  const [wishlist, cart] = await Promise.all([
    WishlistApi.findAll(session!.user.access_token, { page, limit: 8 }),
    CartApi.findAll(session!.user.access_token),
  ]);
  const { items } = wishlist;
  const cartCourseIds = new Set(cart.items.map((item) => item.course.id));

  const buildPageUrl = (nextPage: number) =>
    nextPage === 1 ? "/wishlist" : `/wishlist?page=${nextPage}`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100dvh-3rem)] xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <h1 className="mb-7 text-3xl font-extrabold tracking-tight">Wishlist</h1>

      {items.length === 0 ? (
        <Card className="min-h-128 flex-1 items-center justify-center gap-0 px-6 py-16 text-center">
          <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
            <Heart size={60} className="text-primary/70" />
          </div>
          <h3 className="mb-3 text-2xl font-extrabold">
            Your wishlist is empty
          </h3>
          <p className="mb-8 text-base text-muted-foreground">
            Save courses you&apos;re interested in to find them easily later.
          </p>
          <Button
            nativeButton={false}
            className="h-12 rounded-xl px-9 text-base font-semibold"
            render={<Link href="/courses">Browse Courses</Link>}
          />
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid gap-5 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4 xl:grid-rows-2">
            {items.map((item) => (
              <CourseCard
                key={item.id}
                course={item.course}
                dense
                viewer="STUDENT"
                inWishlist
                inCart={cartCourseIds.has(item.course.id)}
                isAvailable={item.isAvailable}
                returnTo={buildPageUrl(wishlist.page)}
              />
            ))}
          </div>
          <div className="mt-auto shrink-0">
            <Pagination
              currentPage={wishlist.page}
              totalPages={wishlist.totalPages}
              getPageHref={buildPageUrl}
              ariaLabel="Wishlist pages"
            />
          </div>
        </div>
      )}
    </div>
  );
}
