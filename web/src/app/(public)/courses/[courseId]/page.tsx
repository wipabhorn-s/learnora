import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CourseBackButton from "@/components/features/course/CourseBackButton";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/lib/actions/wishlist.action";
import { ApiError } from "@/lib/api/api-error";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi } from "@/lib/api/course.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { formatDuration } from "@/lib/utils";
import {
  AlertCircle,
  BookOpen,
  Clock,
  Heart,
  Play,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addToCartAction,
  removeFromCartAction,
} from "@/lib/actions/cart.actions";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ cartError?: string; wishlistError?: string }>;
}) {
  const { courseId: courseIdParam } = await params;
  const { cartError, wishlistError } = await searchParams;
  const courseId = Number(courseIdParam);

  if (!Number.isInteger(courseId)) notFound();

  let course;
  try {
    course = await CourseApi.findOne(courseId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const session = await auth();
  const isStudent = session?.user.role === "STUDENT";
  let inWishlist = false;
  let inCart = false;
  let isOwned = false;

  if (session && isStudent) {
    const [wishlist, cart, purchases] = await Promise.all([
      WishlistApi.findCourseIds(session.user.access_token),
      CartApi.findAll(session.user.access_token),
      PurchaseApi.findAll(session.user.access_token),
    ]);
    inWishlist = wishlist.includes(courseId);
    inCart = cart.items.some((item) => item.course.id === courseId);
    isOwned = getOwnedCourseIds(purchases).has(courseId);
  }

  const price = Number(course.price);
  const totalSeconds = course.lessons.reduce(
    (sum, lesson) => sum + lesson.durationSeconds,
    0,
  );
  const currentPath = `/courses/${courseId}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-foreground py-10 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <CourseBackButton />
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Link href="/courses" className="hover:text-white">
              Courses
            </Link>
            <span>/</span>
            <span>{course.category.replace("_", " ")}</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">{course.title}</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-white/80">
            {course.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span>
              By{" "}
              <span className="font-medium text-white">
                {course.instructor.firstName} {course.instructor.lastName}
              </span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatDuration(totalSeconds)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <BookOpen size={14} />
              {course.lessons.length} lessons
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card className="overflow-hidden py-0">
            <CourseThumbnail
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-64"
            />
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-xl font-bold">Course Curriculum</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {course.lessons.length} lessons · {formatDuration(totalSeconds)}{" "}
              total
            </p>

            {course.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lessons published yet.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {course.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Play size={14} className="shrink-0 text-primary" />
                    <span className="flex-1 text-sm">
                      {index + 1}. {lesson.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(lesson.durationSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        <div>
          <Card className="sticky top-24 space-y-5 p-6 md:p-7">
            {(cartError || wishlistError) && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {cartError ?? wishlistError}
              </div>
            )}

            <div className="text-4xl font-extrabold tracking-tight text-primary">
              {price === 0 ? "Free" : `฿${price.toLocaleString()}`}
            </div>

            <div className="rounded-2xl bg-muted px-4 py-3.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Access type</span>
                <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  {course.accessType === "LIFETIME"
                    ? "Lifetime"
                    : `${course.accessDuration} days`}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              {!session ? (
                <>
                  <Button
                    nativeButton={false}
                    className="h-12 w-full rounded-xl text-base font-bold"
                    render={
                      <Link href="/login">
                        <ShoppingCart size={19} />
                        Add to Cart
                      </Link>
                    }
                  />
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="h-12 w-full rounded-xl text-base font-bold"
                    render={
                      <Link href="/login">
                        <Heart size={18} />
                        Add to Wishlist
                      </Link>
                    }
                  />
                </>
              ) : !isStudent ? null : isOwned ? (
                <Button
                  nativeButton={false}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                  render={
                    <Link href={`/my-courses/${courseId}/player`}>
                      <BookOpen size={19} />
                      Go to Course
                    </Link>
                  }
                />
              ) : inCart ? (
                <form
                  action={removeFromCartAction.bind(
                    null,
                    courseId,
                    currentPath,
                  )}
                >
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-12 w-full rounded-xl border-primary/30 text-base font-bold text-primary"
                  >
                    <ShoppingCart size={19} />
                    Remove from Cart
                  </Button>
                </form>
              ) : (
                <form
                  action={addToCartAction.bind(null, courseId, currentPath)}
                >
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl text-base font-bold"
                  >
                    <ShoppingCart size={19} />
                    Add to Cart
                  </Button>
                </form>
              )}

              {isStudent && !isOwned && (
                <form
                  action={(inWishlist
                    ? removeFromWishlistAction
                    : addToWishlistAction
                  ).bind(null, courseId, currentPath)}
                >
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-12 w-full rounded-xl text-base font-bold"
                  >
                    <Heart
                      size={16}
                      className={inWishlist ? "fill-red-500 text-red-500" : ""}
                    />
                    {inWishlist ? "Wishlisted" : "Add to Wishlist"}
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
