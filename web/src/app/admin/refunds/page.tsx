import AdminFilters from "@/components/features/admin/AdminFilters";
import RefundButton from "@/components/features/admin/RefundButton";
import RejectRefundButton from "@/components/features/admin/RejectRefundButton";
import EmptyState from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import Pagination from "@/components/shared/Pagination";
import StatusBadge, { type BadgeTone } from "@/components/shared/StatusBadge";
import { Card } from "@/components/ui/card";
import { approveRefundRequestAction } from "@/lib/actions/admin.action";
import { AdminApi, type AdminRefundRequest } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { formatBaht, formatDate, formatEnum, fullName } from "@/lib/format";
import { Undo2 } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Requests | Learnora Admin" };

const STATUS_TONE: Record<AdminRefundRequest["status"], BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const STATUS_LABEL: Record<AdminRefundRequest["status"], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Declined",
};

function RequestCard({ request }: { request: AdminRefundRequest }) {
  const studentName = fullName(request.student);
  const { purchase, course } = request;
  // คอร์สนี้ถูกคืนไปทางอื่นแล้ว (เช่นแอดมินคืนทั้งออเดอร์ที่จ่ายซ้ำ) อนุมัติซ้ำไม่ได้
  const canApprove =
    purchase.paymentStatus === "SUCCESS" &&
    course.enrollmentStatus !== "REFUNDED";

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{studentName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {request.student.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary">
            {formatBaht(course.price)}
          </span>
          <StatusBadge tone={STATUS_TONE[request.status]}>
            {STATUS_LABEL[request.status]}
          </StatusBadge>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Paid with</dt>
          <dd>
            {purchase.paymentMethod ? formatEnum(purchase.paymentMethod) : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Purchased</dt>
          <dd>{formatDate(purchase.purchasedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Requested</dt>
          <dd>{formatDate(request.createdAt)}</dd>
        </div>
      </dl>

      {/* เรียนไปเท่าไรแล้ว ช่วยตัดสินใจ (เรียนเกือบจบแล้วมาขอคืน ควรพิจารณาให้ดี) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm">
        <span className="min-w-0 truncate font-semibold">{course.title}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {course.completedLessons}/{course.totalLessons} lessons completed
        </span>
      </div>
      {purchase.courseCount > 1 && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Part of a {purchase.courseCount}-course order (
          {formatBaht(purchase.total)}). Only this course will be refunded.
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground">
          Student&apos;s reason
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-sm">
          {request.reason}
        </p>
      </div>

      {request.status === "PENDING" ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {!canApprove && (
            <p className="mr-auto text-xs text-muted-foreground">
              This course has already been refunded.
            </p>
          )}
          <RejectRefundButton
            requestId={request.id}
            studentName={studentName}
          />
          {canApprove && (
            <RefundButton
              action={approveRefundRequestAction.bind(null, request.id)}
              label="Approve"
              purchaseId={request.id}
              studentName={studentName}
              studentEmail={request.student.email}
              amount={course.price}
              manualOnly={purchase.paymentMethod === "PROMPTPAY"}
            />
          )}
        </div>
      ) : (
        <div className="border-t pt-4 text-sm text-muted-foreground">
          {STATUS_LABEL[request.status]}
          {request.reviewedBy && ` by ${fullName(request.reviewedBy)}`}
          {request.reviewedAt && ` on ${formatDate(request.reviewedAt)}`}
          {request.refundReference && ` · Ref: ${request.refundReference}`}
          {request.adminNote && (
            <p className="mt-1 whitespace-pre-line break-words text-foreground">
              {request.adminNote}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export default async function AdminRefundRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await auth();
  const data = await AdminApi.findRefundRequests(session!.user.access_token, {
    status: params.status,
    page,
  });

  const buildPageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return `/admin/refunds${qs ? `?${qs}` : ""}`;
  };

  return (
    <Page>
      <PageHeader
        title="Refund Requests"
        description={
          data.pendingCount > 0
            ? `${data.pendingCount} waiting for review. Approving refunds the money right away.`
            : "Students' refund requests. Approving refunds the money right away."
        }
      />

      <AdminFilters
        filterGroups={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Declined" },
            ],
          },
        ]}
      />

      {data.items.length > 0 ? (
        <div className="space-y-4">
          {data.items.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Undo2}
          title="No refund requests"
          description="Requests from students will show up here."
          className="min-h-96"
        />
      )}

      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        getPageHref={buildPageUrl}
      />
    </Page>
  );
}
