import CourseCard from "@/components/features/course/CourseCard";
import EmptyState, { BROWSE_COURSES } from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import Pagination from "@/components/shared/Pagination";
import { CartApi } from "@/lib/api/cart.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { Heart } from "lucide-react";
import { Metadata } from "next";

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
    <Page height="fit">
      <PageHeader title="Wishlist" />

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save courses you're interested in to find them easily later."
          action={BROWSE_COURSES}
          className="min-h-128"
        />
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
    </Page>
  );
}
