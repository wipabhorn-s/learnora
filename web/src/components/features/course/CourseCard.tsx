import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addToCartAction,
  removeFromCartAction,
} from "@/lib/actions/cart.actions";
import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/lib/actions/wishlist.action";
import { CourseResponse } from "@/lib/api/course.api";
import { BookOpen, Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type CourseCardProps = {
  course: CourseResponse;
  compact?: boolean;
  dense?: boolean;
  viewer?: "GUEST" | "STUDENT" | "OTHER";
  inWishlist?: boolean;
  inCart?: boolean;
  isOwned?: boolean;
  isAvailable?: boolean;
  returnTo?: string;
};

export default function CourseCard({
  course,
  compact = false,
  dense = false,
  viewer = "GUEST",
  inWishlist = false,
  inCart = false,
  isOwned = false,
  isAvailable = true,
  returnTo = "/courses",
}: CourseCardProps) {
  const price = Number(course.price);
  const detailHref = `/courses/${course.id}`;
  const showActions = viewer === "GUEST" || viewer === "STUDENT";

  return (
    <Card
      className={`group flex h-full flex-col overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        dense ? "min-h-0" : ""
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden bg-secondary ${
          dense ? "h-28" : compact ? "h-40" : "h-44"
        }`}
      >
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              !isAvailable ? "opacity-60" : ""
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen size={32} className="text-primary/40" />
          </div>
        )}

        <Link
          href={detailHref}
          aria-label={`View ${course.title}`}
          className="absolute inset-0 z-10"
        />

        {showActions && !isOwned && (
          <div
            className={`absolute z-20 ${dense ? "left-2 top-2" : "left-3 top-3"}`}
          >
            {viewer === "GUEST" ? (
              <Button
                nativeButton={false}
                size={dense ? "icon" : "icon-lg"}
                variant="outline"
                className="rounded-full border-white/70 bg-white/90 text-muted-foreground shadow-sm hover:bg-white hover:text-red-500"
                render={
                  <Link href="/login" aria-label="Log in to add to wishlist">
                    <Heart size={18} />
                  </Link>
                }
              />
            ) : (
              <form
                action={(inWishlist
                  ? removeFromWishlistAction
                  : addToWishlistAction
                ).bind(null, course.id, returnTo)}
              >
                <Button
                  type="submit"
                  size={dense ? "icon" : "icon-lg"}
                  variant="outline"
                  aria-label={
                    inWishlist ? "Remove from wishlist" : "Add to wishlist"
                  }
                  className="rounded-full border-white/70 bg-white/90 text-muted-foreground shadow-sm hover:bg-white hover:text-red-500"
                >
                  <Heart
                    size={18}
                    className={inWishlist ? "fill-red-500 text-red-500" : ""}
                  />
                </Button>
              </form>
            )}
          </div>
        )}

        <span
          className={`absolute z-20 rounded-full bg-white/90 font-semibold text-primary shadow ${
            dense
              ? "right-2 top-2 px-2 py-0.5 text-[11px]"
              : "right-3 top-3 px-2.5 py-1 text-xs"
          }`}
        >
          {course.accessType === "LIFETIME"
            ? "Lifetime"
            : `${course.accessDuration} days`}
        </span>

        {!isAvailable && (
          <span className="absolute inset-x-3 bottom-3 z-20 rounded-full bg-destructive px-3 py-1 text-center text-xs font-bold text-white">
            Currently unavailable
          </span>
        )}
      </div>

      <div
        className={`flex flex-1 flex-col ${
          dense
            ? "min-h-0 gap-0.5 p-2.5"
            : compact
              ? "gap-1.5 p-3.5"
              : "gap-2 p-4"
        }`}
      >
        <div
          className={`flex items-center text-muted-foreground ${
            dense ? "gap-1.5 text-[11px]" : "gap-2 text-xs"
          }`}
        >
          <span
            className={`rounded-full bg-secondary font-medium text-secondary-foreground ${
              dense ? "px-1.5 py-px" : "px-2 py-0.5"
            }`}
          >
            {course.category.replaceAll("_", " ")}
          </span>
          <span>{course.level}</span>
        </div>

        <Link
          href={detailHref}
          className={`line-clamp-2 font-bold transition-colors hover:text-primary ${
            dense
              ? "min-h-8 text-[13px] leading-4"
              : compact
                ? "min-h-9 text-sm leading-snug"
                : "min-h-10 text-sm leading-snug"
          }`}
        >
          {course.title}
        </Link>

        <p
          className={`${dense ? "text-[11px] leading-4" : "text-xs"} text-muted-foreground`}
        >
          {course.instructor.firstName} {course.instructor.lastName}
        </p>

        <div
          className={`mt-auto flex items-center justify-between gap-3 ${
            dense ? "gap-2 pt-0" : compact ? "pt-1" : "pt-2"
          }`}
        >
          <span
            className={`${dense ? "text-sm" : "text-lg"} font-extrabold text-primary`}
          >
            {price === 0 ? "Free" : `฿${price.toLocaleString()}`}
          </span>

          {showActions && isAvailable && (
            viewer === "GUEST" ? (
              <Button
                nativeButton={false}
                size={dense ? "xs" : "sm"}
                variant="secondary"
                className={`${dense ? "px-2.5" : "px-4"} rounded-full text-primary`}
                render={
                  <Link href="/login">
                    <ShoppingCart size={15} />
                    Add to Cart
                  </Link>
                }
              />
            ) : isOwned ? (
              <Button
                nativeButton={false}
                size={dense ? "xs" : "sm"}
                variant="secondary"
                className={`${dense ? "px-2.5" : "px-4"} rounded-full text-emerald-700`}
                render={
                  <Link href={`/my-courses/${course.id}/player`}>
                    <BookOpen size={15} />
                    Go to Course
                  </Link>
                }
              />
            ) : (
              <form
                action={(inCart
                  ? removeFromCartAction
                  : addToCartAction
                ).bind(null, course.id, returnTo)}
              >
                <Button
                  type="submit"
                  size={dense ? "xs" : "sm"}
                  variant={inCart ? "outline" : "secondary"}
                  className={`rounded-full ${dense ? "px-2.5" : "px-4"} ${
                    inCart ? "text-destructive" : "text-primary"
                  }`}
                >
                  <ShoppingCart size={15} />
                  {inCart ? "Remove" : "Add to Cart"}
                </Button>
              </form>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
