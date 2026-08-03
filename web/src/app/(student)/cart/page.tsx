import CourseThumbnail from "@/components/shared/CourseThumbnail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { removeFromCartAction } from "@/lib/actions/cart.actions";
import { CartApi } from "@/lib/api/cart.api";

import { auth } from "@/lib/auth";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Your Cart | Learnora" };

export default async function CartPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  const { items, total } = await CartApi.findAll(session.user.access_token);
  const totalNumber = Number(total);
  const hasUnavailable = items.some((item) => !item.isAvailable);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)]">
      <h1 className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-3xl font-extrabold tracking-tight">
        <span>Your Cart</span>
        {items.length > 0 && (
          <span className="relative top-0.5 text-lg font-normal leading-none text-muted-foreground">
            ({items.length} {items.length === 1 ? "course" : "courses"})
          </span>
        )}
      </h1>

      {items.length === 0 ? (
        <Card className="min-h-128 flex-1 items-center justify-center gap-0 px-6 py-16 text-center">
          <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
            <ShoppingCart size={60} className="text-primary/70" />
          </div>
          <h3 className="mb-3 text-2xl font-extrabold">Your cart is empty</h3>
          <p className="mb-8 text-base text-muted-foreground">
            Find a course you love and add it to your cart.
          </p>
          <Button
            nativeButton={false}
            className="h-12 rounded-xl px-9 text-base font-semibold"
            render={<Link href="/courses">Browse Courses</Link>}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            {items.map((item) => {
              const price = Number(item.course.price);

              return (
                <Card
                  key={item.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
                >
                  <CourseThumbnail
                    src={item.course.thumbnailUrl}
                    alt={item.course.title}
                    className="h-44 w-full shrink-0 rounded-xl sm:h-28 sm:w-44"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/courses/${item.course.id}`}
                      className="line-clamp-2 text-base font-bold leading-snug transition-colors hover:text-primary"
                    >
                      {item.course.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.course.instructor.firstName}{" "}
                      {item.course.instructor.lastName}
                    </p>
                    {!item.isAvailable && (
                      <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-between gap-4 sm:w-auto sm:flex-col sm:items-end">
                    <span className="text-lg font-extrabold text-primary">
                      {price === 0 ? "Free" : `฿${price.toLocaleString()}`}
                    </span>
                    <form
                      action={removeFromCartAction.bind(
                        null,
                        item.course.id,
                        "/cart",
                      )}
                    >
                      <button
                        type="submit"
                        aria-label={`Remove ${item.course.title} from cart`}
                        className="rounded-xl border border-border p-2.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={17} />
                      </button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="min-w-0">
            <Card className="sticky top-24 space-y-5 p-6">
              <h2 className="text-lg font-bold">Order Summary</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4">
                    <span className="mr-2 line-clamp-1 flex-1 text-muted-foreground">
                      {item.course.title}
                    </span>
                    <span className="shrink-0 font-medium">
                      {Number(item.course.price) === 0
                        ? "Free"
                        : `฿${Number(item.course.price).toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-border pt-4 font-bold">
                <span>Total</span>
                <span className="text-lg text-primary">
                  {totalNumber === 0
                    ? "Free"
                    : `฿${totalNumber.toLocaleString()}`}
                </span>
              </div>

              {hasUnavailable && (
                <p className="text-xs text-destructive">
                  Remove unavailable courses before checking out.
                </p>
              )}

              <Button
                nativeButton={false}
                className="h-12 w-full rounded-xl text-base font-bold"
                disabled={hasUnavailable}
                render={<Link href="/checkout">Proceed to Checkout</Link>}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
