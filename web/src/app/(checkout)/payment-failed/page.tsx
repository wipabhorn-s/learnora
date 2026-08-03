import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment Failed | Learnora" };

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <AlertCircle size={48} className="text-red-500" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold">Payment Failed</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn&apos;t process your payment. Please try again.
          </p>
        </div>

        <Card className="p-5 text-left">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <div className="mb-1 text-sm font-semibold">
                Reason for failure
              </div>
              <p className="text-sm text-muted-foreground">
                {message ??
                  "Your card was declined. This can happen due to insufficient funds, incorrect card details, or bank restrictions."}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            nativeButton={false}
            className="w-full py-3"
            render={<Link href="/checkout">Try Again</Link>}
          />
          <Button
            nativeButton={false}
            variant="secondary"
            className="w-full"
            render={<Link href="/checkout">Change Payment Method</Link>}
          />
        </div>
      </div>
    </div>
  );
}
