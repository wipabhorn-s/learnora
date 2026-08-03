import CourseCard from "@/components/features/course/CourseCard";
import CourseFilters from "@/components/features/course/CourseFilters";
import Pagination from "@/components/shared/Pagination";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi, FindCoursesResponse } from "@/lib/api/course.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { BookOpen } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Courses | Learnora" };

type SearchParams = {
  search?: string;
  category?: string;
  level?: string;
  accessType?: string;
  page?: string;
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const user = session?.user;

  let data: FindCoursesResponse = {
    courses: [],
    total: 0,
    page: 1,
    totalPages: 0,
  };

  try {
    data = await CourseApi.findAll({
      search: params.search,
      category: params.category,
      level: params.level,
      accessType: params.accessType,
      page: params.page ? Number(params.page) : undefined,
    });
  } catch {
    // ตัวกรองไม่ถูกต้อง (เช่นแก้ URL เอง) → แสดงผลว่าง แทนที่จะพังทั้งหน้า
  }

  let cartCourseIds = new Set<number>();
  let wishlistCourseIds = new Set<number>();
  let ownedCourseIds = new Set<number>();

  if (user?.role === "STUDENT") {
    try {
      const [cart, wishlist, purchases] = await Promise.all([
        CartApi.findAll(user.access_token),
        WishlistApi.findCourseIds(user.access_token),
        PurchaseApi.findAll(user.access_token),
      ]);
      cartCourseIds = new Set(cart.items.map((item) => item.course.id));
      wishlistCourseIds = new Set(wishlist);
      ownedCourseIds = getOwnedCourseIds(purchases);
    } catch {}
  }

  const viewer = !user
    ? "GUEST"
    : user.role === "STUDENT"
      ? "STUDENT"
      : "OTHER";

  const currentQuery = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) currentQuery.set(key, value);
  });
  const returnTo = `/courses${
    currentQuery.size > 0 ? `?${currentQuery.toString()}` : ""
  }`;

  const buildPageUrl = (page: number) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== "page") query.set(key, value);
    });
    query.set("page", String(page));
    return `/courses?${query.toString()}`;
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto flex max-w-7xl items-end gap-8 px-6 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight lg:w-56 lg:shrink-0">
          All Courses
        </h1>
        <p className="ml-auto text-sm text-muted-foreground lg:ml-0">
          {data.total} courses found
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 pb-6 pt-5">
        <aside className="hidden w-56 shrink-0 lg:block">
          <CourseFilters />
        </aside>

        <div className="flex min-h-[calc(100dvh-9.25rem)] flex-1 flex-col">
          {data.courses.length > 0 ? (
            <div className="flex flex-1 flex-col">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    compact
                    viewer={viewer}
                    inCart={cartCourseIds.has(course.id)}
                    inWishlist={wishlistCourseIds.has(course.id)}
                    isOwned={ownedCourseIds.has(course.id)}
                    returnTo={returnTo}
                  />
                ))}
              </div>

              <div className="mt-auto">
                <Pagination
                  currentPage={data.page}
                  totalPages={data.totalPages}
                  getPageHref={buildPageUrl}
                  ariaLabel="Course pages"
                />
              </div>
            </div>
          ) : (
            <div className="py-24 text-center">
              <BookOpen
                size={48}
                className="mx-auto mb-4 text-muted-foreground"
              />
              <h3 className="mb-2 font-bold">No courses found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
