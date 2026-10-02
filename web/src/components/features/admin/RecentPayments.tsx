import StatusBadge, {
  PAYMENT_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import { Card } from "@/components/ui/card";
import type { AdminDashboard } from "@/lib/api/admin.api";
import { formatDate, formatEnum, formatPrice, fullName } from "@/lib/format";
import { ArrowRight, Receipt } from "lucide-react";
import Link from "next/link";

/** การซื้อล่าสุด 5 รายการ (ทุกสถานะ) แอดมินเห็นความเคลื่อนไหวทันทีที่เข้าหน้า */
export default function RecentPayments({
  payments,
}: {
  payments: AdminDashboard["recentPayments"];
}) {
  return (
    <Card className="min-h-0 gap-0 p-6">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Recent payments</h2>
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <Receipt size={22} className="text-primary/70" />
          </div>
          <p className="font-semibold">No payments yet</p>
          <p className="text-sm text-muted-foreground">
            Purchases will show up here as they happen.
          </p>
        </div>
      ) : (
        <ul className="mt-4 min-h-0 flex-1 divide-y overflow-y-auto">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {fullName(payment.student)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(payment.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-semibold">
                  {formatPrice(payment.total)}
                </span>
                <StatusBadge
                  size="sm"
                  tone={PAYMENT_STATUS_TONE[payment.paymentStatus]}
                >
                  {formatEnum(payment.paymentStatus)}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
