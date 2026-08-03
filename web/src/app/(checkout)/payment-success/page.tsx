import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/api-error";
import { PurchaseApi } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { CheckCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Payment Successful | Learnora" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ purchaseId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { purchaseId } = await searchParams;
  if (!purchaseId) redirect("/my-courses");

  let purchase;
  try {
    purchase = await PurchaseApi.findOne(purchaseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const total = Number(purchase.total);

  return (
    <div className="flex items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold">Payment Successful!</h1>
          <p className="mt-2 text-muted-foreground">
            Your course access has been activated. Happy learning!
          </p>
        </div>

        <Card className="space-y-3 p-5 text-left">
          {purchase.purchaseItems.map((item) => (
            <h3 key={item.course.id} className="text-sm font-bold">
              {item.course.title}
            </h3>
          ))}

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-bold text-primary">
                {total === 0 ? "Free" : `฿${total.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs">{purchase.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>
                {purchase.purchasedAt
                  ? new Date(purchase.purchasedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </span>
            </div>
          </div>
        </Card>

        <Button
          nativeButton={false}
          className="h-12 w-full text-base font-semibold"
          render={<Link href="/my-courses">Go to My Courses</Link>}
        />
      </div>
    </div>
  );
}
