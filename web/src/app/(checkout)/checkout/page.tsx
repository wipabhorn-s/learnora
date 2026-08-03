import CheckoutForm from "@/components/features/purchase/CheckoutForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import { checkoutAction } from "@/lib/actions/purchase.action";
import { CartApi } from "@/lib/api/cart.api";
import { auth } from "@/lib/auth";
import { ArrowLeft, Shield } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Checkout | Learnora" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { items, total } = await CartApi.findAll(session.user.access_token);

  if (items.length === 0) redirect("/cart");
  if (items.some((item) => !item.isAvailable)) redirect("/cart");

  const totalNumber = Number(total);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/cart"
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Cart
      </Link>

      <h1 className="mb-8 text-3xl font-extrabold">Checkout</h1>

      <div className="grid gap-8 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <Card className="p-6">
            <h2 className="mb-1 font-bold">Credit / Debit Card</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              Visa, Mastercard, and other major cards accepted
            </p>

            {totalNumber === 0 ? (
              <form action={checkoutAction.bind(null, undefined)}>
                <Button type="submit" className="w-full py-3">
                  Confirm Order — Free
                </Button>
              </form>
            ) : (
              <CheckoutForm total={totalNumber} />
            )}
          </Card>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-muted-foreground">
            <Shield size={16} className="shrink-0 text-emerald-600" />
            <span>
              Your payment is secured with 256-bit SSL encryption. We never
              store your card details.
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="sticky top-24 space-y-4 p-6">
            <h2 className="font-bold">Order Summary</h2>

            {items.map((item) => {
              const price = Number(item.course.price);
              return (
                <div key={item.id} className="flex gap-3">
                  <CourseThumbnail
                    src={item.course.thumbnailUrl}
                    alt={item.course.title}
                    className="h-12 w-16 shrink-0 rounded-lg"
                  />
                  <h3 className="line-clamp-2 flex-1 text-xs font-semibold leading-snug">
                    {item.course.title}
                  </h3>
                  <span className="shrink-0 font-bold text-primary">
                    {price === 0 ? "Free" : `฿${price.toLocaleString()}`}
                  </span>
                </div>
              );
            })}

            <div className="flex justify-between border-t border-border pt-3 text-sm font-bold">
              <span>Total</span>
              <span className="text-lg text-primary">
                {totalNumber === 0
                  ? "Free"
                  : `฿${totalNumber.toLocaleString()}`}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
