import CourseThumbnail from "@/components/shared/CourseThumbnail";
import EmptyState, { BROWSE_COURSES } from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { removeFromCartAction } from "@/lib/actions/cart.actions";
import { CartApi } from "@/lib/api/cart.api";
import { auth } from "@/lib/auth";
import { formatCount, formatPrice, fullName } from "@/lib/format";
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
    <Page height="fill">
      <PageHeader
        title={
          <>
            Your Cart
            {items.length > 0 && (
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                ({formatCount(items.length, "course")})
              </span>
            )}
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Find a course you love and add it to your cart."
          action={BROWSE_COURSES}
          className="min-h-128"
        />
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
                      {fullName(item.course.instructor)}
                    </p>
                    {!item.isAvailable && (
                      <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-between gap-4 sm:w-auto sm:flex-col sm:items-end">
                    <span className="text-lg font-extrabold text-primary">
                      {formatPrice(price)}
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
                      {formatPrice(item.course.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-border pt-4 font-bold">
                <span>Total</span>
                <span className="text-lg text-primary">
                  {formatPrice(totalNumber)}
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
    </Page>
  );
}
