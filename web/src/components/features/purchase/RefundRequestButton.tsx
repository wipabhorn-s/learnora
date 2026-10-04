"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { requestRefundAction } from "@/lib/actions/purchase.action";
import { formatBaht, formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

const MIN_REASON = 10;
const MAX_REASON = 1000;

/**
 * นักเรียนขอคืนเงินทีละคอร์ส: ส่งเหตุผลให้แอดมินพิจารณา ยังไม่คืนเงินทันที
 * ขอได้ครั้งเดียวต่อคอร์ส จึงบอกให้ชัดก่อนกดส่ง
 */
export default function RefundRequestButton({
  purchaseItemId,
  courseTitle,
  amount,
  deadline,
}: {
  purchaseItemId: string;
  courseTitle: string;
  amount: string;
  deadline: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (reason.trim().length < MIN_REASON) {
      setError(`Please tell us a bit more (at least ${MIN_REASON} characters)`);
      return;
    }

    startTransition(async () => {
      const result = await requestRefundAction(purchaseItemId, reason);
      toast.result(result);
      if (result.success) {
        setOpen(false);
        setReason("");
      }
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      pending={isPending}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-semibold"
          onClick={() => setOpen(true)}
        >
          Refund
        </Button>
      }
      title={`Request a refund of ${formatBaht(amount)}`}
      description={
        <>
          For &quot;{courseTitle}&quot;. Our team will review your request and
          email you the result. If it&apos;s approved, the money goes back to
          your original payment method and you&apos;ll lose access to this
          course. Other courses in the same order aren&apos;t affected. You can
          send one request per course, until {formatDate(deadline)}.
        </>
      }
      confirmLabel="Send request"
      pendingLabel="Sending..."
      onConfirm={submit}
    >
      <Field className="gap-1.5" data-invalid={!!error}>
        <FieldLabel htmlFor={`refund-reason-${purchaseItemId}`}>
          Why are you requesting a refund?
        </FieldLabel>
        <Textarea
          id={`refund-reason-${purchaseItemId}`}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          rows={5}
          maxLength={MAX_REASON}
          placeholder="Enter your reason"
          aria-invalid={!!error}
          disabled={isPending}
          className="min-h-28 resize-y"
        />
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {reason.length}/{MAX_REASON}
        </p>
        <FieldError>{error}</FieldError>
      </Field>
    </ConfirmDialog>
  );
}
