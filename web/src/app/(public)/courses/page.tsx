import CourseCard from "@/components/features/course/CourseCard";
import CourseFilters from "@/components/features/course/CourseFilters";
import CourseToolbar from "@/components/features/course/CourseToolbar";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import { Card } from "@/components/ui/card";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi, FindCoursesResponse } from "@/lib/api/course.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { FILTER_KEYS } from "@/lib/constants/course-filters";
import { formatEnum } from "@/lib/format";
import { CATEGORIES } from "@/lib/schemas/course.schema";
import { BookOpen, SearchX } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

export const metadata: Metadata = { title: "Courses | Learnora" };

type SearchParams = {
  search?: string;
  category?: string;
  level?: string;
  accessType?: string;
  sort?: string;
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
      sort: params.sort,
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
    } catch (error) {
      // session ใช้ไม่ได้แล้ว apiFetch จะ redirect ไปล็อกเอาต์ ห้ามกลืนไว้
      unstable_rethrow(error);
    }
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

  // กรองหรือค้นหาอยู่ = หน้าว่างเพราะตัวกรอง ไม่ใช่เพราะยังไม่มีคอร์สเลย
  const isFiltered = FILTER_KEYS.some(
    (key) => params[key as keyof SearchParams],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl gap-8 px-6 py-8">
      {/* หัวข้อหน้าไม่แสดง (ผู้ใช้รู้อยู่แล้วว่าอยู่หน้าไหน) แต่ยังมี h1 ให้ screen reader */}
      <h1 className="sr-only">Courses</h1>

      <aside className="hidden w-60 shrink-0 lg:block">
        <Card className="sticky top-24 p-5">
          <CourseFilters />
        </Card>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <CourseToolbar total={data.total} />

        {data.courses.length > 0 ? (
          <>
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
                  isMine={course.instructorId === user?.id}
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
          </>
        ) : isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="No courses match"
            description="Try a different search, or browse a category instead."
            className="flex-none py-12"
          >
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {CATEGORIES.map((category) => (
                <Link
                  key={category}
                  href={`/courses?category=${category}`}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {formatEnum(category)}
                </Link>
              ))}
            </div>
          </EmptyState>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="New courses are on the way — check back soon."
            className="flex-none py-12"
          />
        )}
      </div>
    </div>
  );
}
