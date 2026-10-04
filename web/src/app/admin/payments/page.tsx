import AdminFilters from "@/components/features/admin/AdminFilters";
import AdminTable, {
  PrimaryCell,
} from "@/components/features/admin/AdminTable";
import RefundButton from "@/components/features/admin/RefundButton";
import { Page, PageHeader } from "@/components/shared/Page";
import Pagination from "@/components/shared/Pagination";
import StatusBadge, {
  PAYMENT_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import ToastFromUrl from "@/components/shared/ToastFromUrl";
import { refundPurchaseAction } from "@/lib/actions/admin.action";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date-range";
import { formatDate, formatEnum, formatPrice, fullName } from "@/lib/format";
import { Receipt } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Payments | Learnora Admin" };

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    refundNeeded?: string;
    range?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await auth();
  const data = await AdminApi.findPayments(session!.user.access_token, {
    status: params.status,
    refundNeeded: params.refundNeeded,
    ...resolveDateRange(params),
    page,
  });

  // เปลี่ยนหน้าต้องคงตัวกรองทุกตัวไว้ แค่เปลี่ยนเลขหน้า
  const buildPageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    for (const key of [
      "status",
      "refundNeeded",
      "range",
      "from",
      "to",
    ] as const) {
      const value = params[key];
      if (value) query.set(key, value);
    }
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return `/admin/payments${qs ? `?${qs}` : ""}`;
  };

  return (
    <Page height="fit">
      <PageHeader
        title="Payments"
        description="Every purchase made on the platform."
      />
      <ToastFromUrl params={["error"]} />

      <AdminFilters
        dateRange
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
          {
            key: "refundNeeded",
            label: "Action",
            options: [{ value: "true", label: "Refund needed" }],
          },
        ]}
      />

      <AdminTable
        columns={[
          { label: "Student" },
          { label: "Amount", align: "right" },
          { label: "Method" },
          { label: "Date" },
          { label: "Status", align: "center" },
          { label: "Action", align: "center" },
        ]}
        template="minmax(16rem,1.8fr) 7rem 9rem 8rem 9rem 7rem"
        rows={data.items}
        getKey={(purchase) => purchase.id}
        renderRow={(purchase) => [
          <PrimaryCell
            key="student"
            title={fullName(purchase.student)}
            subtitle={purchase.purchaseItems
              .map((item) => item.course.title)
              .join(", ")}
            code={purchase.id}
          />,
          <span key="amount" className="font-semibold">
            {formatPrice(purchase.total)}
          </span>,
          <span key="method" className="text-muted-foreground">
            {purchase.paymentMethod ? formatEnum(purchase.paymentMethod) : "-"}
          </span>,
          <span key="date" className="text-muted-foreground">
            {formatDate(purchase.purchasedAt ?? purchase.createdAt)}
          </span>,
          <div key="status" className="flex flex-col items-center gap-1">
            <StatusBadge tone={PAYMENT_STATUS_TONE[purchase.paymentStatus]}>
              {formatEnum(purchase.paymentStatus)}
            </StatusBadge>
            {/* จ่ายซ้ำทางพร้อมเพย์ คืนผ่าน Opn ไม่ได้ ต้องโอนคืนเอง */}
            {purchase.manualRefundNeeded && (
              <StatusBadge size="sm" tone="danger">
                Refund needed
              </StatusBadge>
            )}
            {purchase.refundRequests.some(
              (request) => request.status === "PENDING",
            ) && (
              <StatusBadge size="sm" tone="warning">
                Refund requested
              </StatusBadge>
            )}
            {purchase.paymentStatus === "SUCCESS" &&
              Number(purchase.refundedAmount) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatPrice(purchase.refundedAmount)} refunded
                </span>
              )}
            {purchase.refundReference && (
              <span
                className="max-w-full truncate text-xs text-muted-foreground"
                title={purchase.refundReference}
              >
                Ref: {purchase.refundReference}
              </span>
            )}
          </div>,
          // คืนเงินทั่วไปต้องมาจากคำขอของนักเรียน (หน้า Refund Requests)
          // ที่นี่คืนตรงได้เฉพาะรายการที่ระบบตรวจพบว่าจ่ายซ้ำ
          purchase.paymentStatus === "SUCCESS" &&
            purchase.manualRefundNeeded && (
              <RefundButton
                key="action"
                action={refundPurchaseAction.bind(null, purchase.id)}
                purchaseId={purchase.id}
                studentName={fullName(purchase.student)}
                studentEmail={purchase.student.email}
                amount={purchase.total}
                manualOnly={purchase.paymentMethod === "PROMPTPAY"}
              />
            ),
        ]}
        empty={{
          icon: Receipt,
          title: "No payments found",
          description: "Try changing the status or date filter.",
        }}
      />

      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        getPageHref={buildPageUrl}
        ariaLabel="Payment pages"
      />
    </Page>
  );
}
