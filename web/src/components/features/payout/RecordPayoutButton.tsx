"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { recordPayoutAction } from "@/lib/actions/payout.action";
import type { PayoutAccount } from "@/lib/api/payout.api";
import { formatBaht } from "@/lib/format";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

/**
 * แอดมินโอนเงินให้ผู้สอนเองนอกระบบ แล้วบันทึกยอดกับเลขอ้างอิงที่นี่
 * ยอดเริ่มต้น = ยอดที่จ่ายได้ทั้งหมด แก้ให้น้อยกว่าได้ (จ่ายบางส่วน)
 */
export default function RecordPayoutButton({
  instructorId,
  instructorName,
  available,
  account,
}: {
  instructorId: string;
  instructorName: string;
  available: string;
  account: PayoutAccount;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(available);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const value = Number(amount);
    if (!(value > 0) || value > Number(available)) {
      setError(`Enter an amount between ฿0.01 and ${formatBaht(available)}`);
      return;
    }
    if (!reference.trim()) {
      setError("Enter the transfer reference");
      return;
    }

    startTransition(async () => {
      const result = await recordPayoutAction({
        instructorId,
        amount: value,
        reference,
      });
      toast.result(result);
      if (result.success) {
        setOpen(false);
        setReference("");
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount(available);
          setError(null);
        }
      }}
      pending={isPending}
      trigger={
        <Button
          type="button"
          size="sm"
          className="w-24 font-semibold"
          onClick={() => setOpen(true)}
        >
          Pay out
        </Button>
      }
      title={`Pay ${instructorName}`}
      description={
        <>
          Transfer the money to{" "}
          <span className="font-semibold text-foreground">
            {account.bankName} · {account.accountNumber} ({account.accountName})
          </span>{" "}
          first, then record it here. The instructor gets an email with the
          reference.
        </>
      }
      confirmLabel="Record payout"
      onConfirm={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-1.5" data-invalid={!!error}>
          <FieldLabel required htmlFor={`payout-amount-${instructorId}`}>
            Amount (฿)
          </FieldLabel>
          <Input
            id={`payout-amount-${instructorId}`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            max={available}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
            disabled={isPending}
          />
        </Field>
        <Field className="gap-1.5" data-invalid={!!error}>
          <FieldLabel required htmlFor={`payout-reference-${instructorId}`}>
            Transfer reference
          </FieldLabel>
          <Input
            id={`payout-reference-${instructorId}`}
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setError(null);
            }}
            placeholder="Enter reference number"
            maxLength={100}
            disabled={isPending}
          />
        </Field>
      </div>
      <FieldError>{error}</FieldError>
    </ConfirmDialog>
  );
}
