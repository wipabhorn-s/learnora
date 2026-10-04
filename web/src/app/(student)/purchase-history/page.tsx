import RefundRequestButton from "@/components/features/purchase/RefundRequestButton";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import EmptyState, { BROWSE_COURSES } from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import StatusBadge, {
  type BadgeTone,
  PAYMENT_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import { Card } from "@/components/ui/card";
import { PurchaseApi, PurchaseResponse } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { formatDate, formatEnum, formatPrice, fullName } from "@/lib/format";
import { canRequestRefund } from "@/lib/refund";
import { Clock, Receipt, XCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Purchase History | Learnora" };

const ENROLLMENT_STATUS_TONE: Record<
  PurchaseResponse["purchaseItems"][number]["enrollmentStatus"],
  BadgeTone
> = {
  ACTIVE: "success",
  EXPIRED: "danger",
  REFUNDED: "neutral",
};

type Item = PurchaseResponse["purchaseItems"][number];

/**
 * สถานะคำขอคืนเงินของคอร์สหนึ่ง (แสดงใต้ชื่อคอร์ส) ไม่เคยขอ = ไม่แสดงอะไร
 * อนุมัติแล้วไม่ต้องบอกซ้ำ ป้าย Refunded ของคอร์สบอกอยู่แล้ว
 */
function RefundStatus({ request }: { request: Item["refundRequest"] }) {
  if (request?.status === "PENDING") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
        <Clock size={13} className="shrink-0" />
        Refund requested on {formatDate(request.createdAt)} — under review
      </p>
    );
  }

  if (request?.status === "REJECTED") {
    return (
      <div className="mt-1 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-red-700">
          <XCircle size={13} className="shrink-0" />
          Refund request declined
        </p>
        {request.adminNote && (
          <p className="mt-0.5 whitespace-pre-line break-words text-muted-foreground">
            {request.adminNote}
          </p>
        )}
      </div>
    );
  }

  return null;
}

function PurchaseRow({ purchase }: { purchase: PurchaseResponse }) {
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
          <span className="text-right">
            <span className="block text-sm font-bold text-primary">
              {formatPrice(purchase.total)}
            </span>
            {/* คืนบางคอร์สไปแล้ว (คืนทั้งออเดอร์จะเห็นเป็นสถานะ Refunded แทน) */}
            {purchase.paymentStatus === "SUCCESS" &&
              Number(purchase.refundedAmount) > 0 && (
                <span className="block text-xs text-muted-foreground">
                  {formatPrice(purchase.refundedAmount)} refunded
                </span>
              )}
          </span>
          <StatusBadge tone={PAYMENT_STATUS_TONE[purchase.paymentStatus]}>
            {formatEnum(purchase.paymentStatus)}
          </StatusBadge>
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
                {fullName(item.course.instructor)}
                {Number(item.price) > 0 && ` · ${formatPrice(item.price)}`}
              </p>
              <RefundStatus request={item.refundRequest} />
            </div>
            {canRequestRefund(purchase, item) && (
              <RefundRequestButton
                purchaseItemId={item.id}
                courseTitle={item.course.title}
                amount={item.price}
                deadline={purchase.refundDeadline!}
              />
            )}
            <StatusBadge tone={ENROLLMENT_STATUS_TONE[item.enrollmentStatus]}>
              {formatEnum(item.enrollmentStatus)}
            </StatusBadge>
          </div>
        ))}
      </div>

      {purchase.purchaseItems.some((item) =>
        canRequestRefund(purchase, item),
      ) && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          You can request a refund for each course until{" "}
          {formatDate(purchase.refundDeadline)}.
        </p>
      )}
    </Card>
  );
}

export default async function PurchaseHistoryPage() {
  const session = await auth();
  const purchases = await PurchaseApi.findAll(session!.user.access_token);

  if (purchases.length === 0) {
    return (
      <Page height="fill">
        <PageHeader title="Purchase History" />
        <EmptyState
          icon={Receipt}
          title="No purchases yet"
          description="Your purchase history will show up here once you buy a course."
          action={BROWSE_COURSES}
          className="min-h-128"
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Purchase History"
        description="A record of every purchase you've made."
      />

      <div className="space-y-4">
        {purchases.map((purchase) => (
          <PurchaseRow key={purchase.id} purchase={purchase} />
        ))}
      </div>
    </Page>
  );
}
