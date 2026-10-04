import AdminTable, {
  PrimaryCell,
} from "@/components/features/admin/AdminTable";
import RecordPayoutButton from "@/components/features/payout/RecordPayoutButton";
import { Page, PageHeader } from "@/components/shared/Page";
import StatusBadge from "@/components/shared/StatusBadge";
import { PayoutApi } from "@/lib/api/payout.api";
import { auth } from "@/lib/auth";
import { LEGAL } from "@/lib/constants/legal";
import { formatBaht, formatDate, fullName } from "@/lib/format";
import { Landmark, Wallet } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Payouts | Learnora Admin" };

export default async function AdminPayoutsPage() {
  const session = await auth();
  const data = await PayoutApi.getAdminOverview(session!.user.access_token);

  return (
    <Page>
      <PageHeader
        title="Payouts"
        description={`Instructors receive ${data.sharePercent}% of each sale, available ${LEGAL.REFUND_WINDOW_DAYS} days after purchase. Transfer the money yourself, then record it here.`}
      />

      <AdminTable
        columns={[
          { label: "Instructor" },
          { label: "Payout account" },
          { label: "Pending", align: "right" },
          { label: "Paid out", align: "right" },
          { label: "Available", align: "right" },
          { label: "Action", align: "center" },
        ]}
        template="minmax(14rem,1.4fr) minmax(14rem,1.4fr) 7rem 7rem 7rem 7rem"
        rows={data.instructors}
        getKey={(instructor) => instructor.id}
        renderRow={(instructor) => [
          <PrimaryCell
            key="instructor"
            title={fullName(instructor)}
            subtitle={instructor.email}
          />,
          instructor.account ? (
            <PrimaryCell
              key="account"
              title={instructor.account.bankName}
              subtitle={`${instructor.account.accountNumber} · ${instructor.account.accountName}`}
            />
          ) : (
            <StatusBadge key="account" tone="warning" size="sm">
              Not added yet
            </StatusBadge>
          ),
          <span key="pending" className="text-muted-foreground">
            {formatBaht(instructor.pending)}
          </span>,
          <span key="paid">{formatBaht(instructor.paidOut)}</span>,
          <span
            key="available"
            className={
              Number(instructor.available) < 0
                ? "font-bold text-destructive"
                : "font-bold text-primary"
            }
          >
            {formatBaht(instructor.available)}
          </span>,
          Number(instructor.available) > 0 && instructor.account ? (
            <RecordPayoutButton
              key="action"
              instructorId={instructor.id}
              instructorName={fullName(instructor)}
              available={instructor.available}
              account={instructor.account}
            />
          ) : (
            <span key="action" className="text-sm text-muted-foreground">
              —
            </span>
          ),
        ]}
        empty={{
          icon: Wallet,
          title: "No instructor earnings yet",
          description: "Instructors show up here after their first paid sale.",
        }}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Recent payouts</h2>
        <AdminTable
          columns={[
            { label: "Instructor" },
            { label: "Reference" },
            { label: "Recorded by" },
            { label: "Date" },
            { label: "Amount", align: "right" },
          ]}
          template="minmax(12rem,1.2fr) minmax(10rem,1fr) 10rem 8rem 7rem"
          rows={data.recentPayouts}
          getKey={(payout) => payout.id}
          renderRow={(payout) => [
            <PrimaryCell
              key="instructor"
              title={fullName(payout.instructor)}
            />,
            <span key="reference" className="truncate font-mono text-sm">
              {payout.reference}
            </span>,
            <span key="by" className="truncate text-sm text-muted-foreground">
              {fullName(payout.recordedBy)}
            </span>,
            <span key="date" className="text-sm">
              {formatDate(payout.createdAt)}
            </span>,
            <span key="amount" className="font-bold">
              {formatBaht(payout.amount)}
            </span>,
          ]}
          empty={{
            icon: Landmark,
            title: "No payouts recorded",
            description: "Payouts you record will show up here.",
          }}
        />
      </section>
    </Page>
  );
}
