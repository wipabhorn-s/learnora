import CheckoutForm from "@/components/features/purchase/CheckoutForm";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import TextLink from "@/components/shared/TextLink";
import { Card } from "@/components/ui/card";
import { CartApi } from "@/lib/api/cart.api";
import { PurchaseApi } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { formatBaht, formatPrice } from "@/lib/format";
import { ArrowLeft, Clock, Shield } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Checkout | Learnora" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // ?new=1 = ผู้ใช้กดยืนยันจากหน้ารอจ่ายแล้วว่าจะยกเลิกรายการเดิมแล้วเลือกช่องทางใหม่
  const replacePending = (await searchParams).new === "1";

  const [{ items, total }, purchases] = await Promise.all([
    CartApi.findAll(session.user.access_token),
    PurchaseApi.findAll(session.user.access_token),
  ]);
  // เรียงใหม่สุดก่อนอยู่แล้ว เอารายการที่ยังรอจ่ายล่าสุด
  const waiting = purchases.find(
    (purchase) => purchase.paymentStatus === "PENDING",
  );

  // มีรายการรอจ่ายอยู่ กลับไปจ่ายรายการเดิมก่อน ไม่สร้าง QR ใบใหม่ซ้อน
  if (waiting && !replacePending) {
    redirect(`/checkout/pending?purchaseId=${waiting.id}`);
  }

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
          {waiting && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <Clock size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p>
                <span className="font-semibold">
                  Your {formatBaht(waiting.total)} payment will be cancelled
                </span>{" "}
                when you pay with the method below.{" "}
                <TextLink href={`/checkout/pending?purchaseId=${waiting.id}`}>
                  Go back to it
                </TextLink>
              </p>
            </div>
          )}

          <Card className="p-6">
            <h2 className="font-bold">
              {totalNumber === 0 ? "Confirm your order" : "Payment method"}
            </h2>
            <CheckoutForm total={totalNumber} replacePending={replacePending} />
          </Card>

          {totalNumber > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-muted-foreground">
              <Shield size={16} className="shrink-0 text-emerald-600" />
              <span>
                Payments are processed securely by Opn Payments. Your card
                details go straight to them — we never see or store them.
              </span>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <Card className="sticky top-24 space-y-4 p-6">
            <h2 className="font-bold">Order Summary</h2>

            {items.map((item) => (
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
                  {formatPrice(item.course.price)}
                </span>
              </div>
            ))}

            <div className="flex justify-between border-t border-border pt-3 text-sm font-bold">
              <span>Total</span>
              <span className="text-lg text-primary">
                {formatPrice(totalNumber)}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
