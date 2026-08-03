import AdminFilters from "@/components/features/admin/AdminFilters";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { refundPurchaseAction } from "@/lib/actions/admin.action";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { Receipt } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Payments | Learnora Admin" };

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
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

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await auth();
  const data = await AdminApi.findPayments(session!.user.access_token, {
    status: params.status,
    page,
  });

  const buildPageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return `/admin/payments${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every purchase made on the platform.
        </p>
      </div>

      {params.error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminFilters
          className="min-w-0 flex-1"
          filterGroups={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "PENDING", label: "Pending" },
                { value: "SUCCESS", label: "Success" },
                { value: "FAILED", label: "Failed" },
                { value: "REFUNDED", label: "Refunded" },
              ],
            },
          ]}
        />
        <span className="shrink-0 self-start text-sm text-muted-foreground sm:self-auto sm:pr-1">
          <span className="font-semibold text-foreground">{data.total}</span>{" "}
          {data.total === 1 ? "payment" : "payments"}
        </span>
      </div>

      {data.items.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <Card className="min-h-0 flex-1 gap-0 divide-y overflow-auto p-0">
            {data.items.map((purchase) => (
              <div
                key={purchase.id}
                className="flex shrink-0 flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {purchase.student.firstName} {purchase.student.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {purchase.purchaseItems
                      .map((item) => item.course.title)
                      .join(", ")}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {purchase.id}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {Number(purchase.total) === 0
                        ? "Free"
                        : `฿${Number(purchase.total).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(purchase.purchasedAt ?? purchase.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[purchase.paymentStatus]}`}
                  >
                    {purchase.paymentStatus}
                  </span>
                  {purchase.paymentStatus === "SUCCESS" && (
                    <form
                      action={refundPurchaseAction.bind(null, purchase.id)}
                    >
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        className="font-semibold"
                      >
                        Refund
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </Card>
          <div className="shrink-0">
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              getPageHref={buildPageUrl}
              ariaLabel="Payment pages"
            />
          </div>
        </div>
      ) : (
        <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
          <div className="flex h-full min-h-96 flex-col items-center justify-center gap-3 p-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
              <Receipt size={38} className="text-primary/70" />
            </div>
            <p className="text-lg font-bold">No payments found</p>
            <p className="text-sm text-muted-foreground">
              Try changing the status filter.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
