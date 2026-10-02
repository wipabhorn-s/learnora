import PayoutAccountForm from "@/components/features/payout/PayoutAccountForm";
import EmptyState from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import StatCard from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { PayoutApi } from "@/lib/api/payout.api";
import { auth } from "@/lib/auth";
import { LEGAL } from "@/lib/constants/legal";
import { formatBaht, formatDate } from "@/lib/format";
import { Clock, Landmark, Wallet, WalletCards } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Earnings | Learnora" };

export default async function InstructorEarningsPage() {
  const session = await auth();
  const earnings = await PayoutApi.getEarnings(session!.user.access_token);

  return (
    <Page>
      <PageHeader
        title="Earnings"
        description={`You receive ${earnings.sharePercent}% of every sale. Money becomes available ${LEGAL.REFUND_WINDOW_DAYS} days after purchase, once the refund window has closed.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={22} />}
          iconClassName="bg-emerald-50 text-emerald-600"
          label="Available to pay out"
          value={formatBaht(earnings.available)}
        />
        <StatCard
          icon={<Clock size={22} />}
          iconClassName="bg-amber-50 text-amber-600"
          label="Pending (refund window)"
          value={formatBaht(earnings.pending)}
        />
        <StatCard
          icon={<Landmark size={22} />}
          iconClassName="bg-blue-50 text-blue-600"
          label="Paid out"
          value={formatBaht(earnings.paidOut)}
        />
        <StatCard
          icon={<WalletCards size={22} />}
          iconClassName="bg-violet-50 text-violet-600"
          label="Total earned"
          value={formatBaht(earnings.totalEarned)}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <PayoutAccountForm account={earnings.account} />

        {earnings.payouts.length > 0 ? (
          <Card className="gap-0 overflow-hidden p-0">
            <h2 className="border-b px-6 py-4 font-bold">Payout history</h2>
            <ul className="divide-y">
              {earnings.payouts.map((payout) => (
                <li
                  key={payout.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatDate(payout.createdAt)}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      Ref. {payout.reference}
                    </p>
                  </div>
                  <p className="font-bold text-primary">
                    {formatBaht(payout.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon={Landmark}
            title="No payouts yet"
            description={
              earnings.account
                ? "Your payouts will show up here once we transfer your earnings."
                : "Add your payout account so we can transfer your earnings."
            }
            className="min-h-80"
          />
        )}
      </div>
    </Page>
  );
}
