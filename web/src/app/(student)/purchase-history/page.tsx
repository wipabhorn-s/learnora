import CourseThumbnail from "@/components/shared/CourseThumbnail";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PurchaseApi, PurchaseResponse } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { Receipt } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Purchase History | Learnora" };

const PAYMENT_STATUS_STYLE: Record<PurchaseResponse["paymentStatus"], string> =
  {
    SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    FAILED: "border-red-200 bg-red-50 text-red-700",
    REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
  };

const ENROLLMENT_STATUS_STYLE: Record<
  PurchaseResponse["purchaseItems"][number]["enrollmentStatus"],
  string
> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EXPIRED: "border-red-200 bg-red-50 text-red-700",
  REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PurchaseRow({ purchase }: { purchase: PurchaseResponse }) {
  const total = Number(purchase.total);

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {formatDate(purchase.purchasedAt ?? purchase.createdAt)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {purchase.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary">
            {total === 0 ? "Free" : `฿${total.toLocaleString()}`}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${PAYMENT_STATUS_STYLE[purchase.paymentStatus]}`}
          >
            {purchase.paymentStatus}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {purchase.purchaseItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <CourseThumbnail
              src={item.course.thumbnailUrl}
              alt={item.course.title}
              className="h-14 w-20 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {item.course.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.course.instructor.firstName}{" "}
                {item.course.instructor.lastName}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${ENROLLMENT_STATUS_STYLE[item.enrollmentStatus]}`}
            >
              {item.enrollmentStatus}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function PurchaseHistoryPage() {
  const session = await auth();
  const purchases = await PurchaseApi.findAll(session!.user.access_token);

  if (purchases.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)]">
        <h1 className="mb-7 text-3xl font-extrabold tracking-tight">
          Purchase History
        </h1>
        <Card className="min-h-128 flex-1 items-center justify-center gap-0 px-6 py-16 text-center">
          <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
            <Receipt size={60} className="text-primary/70" />
          </div>
          <h2 className="mb-3 text-2xl font-extrabold">No purchases yet</h2>
          <p className="mb-8 text-base text-muted-foreground">
            Your purchase history will show up here once you buy a course.
          </p>
          <Link
            href="/courses"
            className={buttonVariants({
              className: "h-12 rounded-xl px-9 text-base font-semibold",
            })}
          >
            Browse Courses
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Purchase History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A record of every purchase you&apos;ve made.
        </p>
      </div>

      <div className="space-y-4">
        {purchases.map((purchase) => (
          <PurchaseRow key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </div>
  );
}
