"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ErrorActionResult } from "@/lib/actions/action.type";
import { formatBaht } from "@/lib/format";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

/**
 * คืนเงินย้อนกลับไม่ได้ จึงต้องยืนยันก่อนเสมอ มี 2 โหมด
 * - อัตโนมัติ: คืนผ่าน Opn (บัตร ฯลฯ)
 * - คืนเอง: ช่องทางที่คืนผ่าน Opn ไม่ได้ (พร้อมเพย์) แอดมินโอนคืนเองแล้วกรอกเลขอ้างอิง
 *   รู้ล่วงหน้าจากช่องทางที่จ่าย หรือสลับให้เองเมื่อ API ตอบว่าคืนอัตโนมัติไม่ได้
 *
 * action คือ server action ที่ bind id ไว้แล้ว ใช้ได้ทั้งคืนเงินตรงจากหน้า Payments
 * และอนุมัติคำขอคืนเงินจากหน้า Refund Requests
 */
export default function RefundButton({
  purchaseId,
  studentName,
  studentEmail,
  amount,
  manualOnly,
  action,
  label = "Refund",
}: {
  purchaseId: string;
  studentName: string;
  studentEmail: string;
  amount: string;
  manualOnly: boolean;
  action: (manual?: {
    reference: string;
  }) => Promise<{ success: true; message: string } | ErrorActionResult>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(manualOnly);
  const [reference, setReference] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmRefund = () => {
    if (manual && !reference.trim()) {
      setReferenceError("Enter the transfer reference");
      return;
    }

    startTransition(async () => {
      const result = await action(manual ? { reference } : undefined);

      if (!result.success && result.code === "REFUND_NOT_SUPPORTED") {
        setManual(true);
      }
      toast.result(result);
      if (result.success) setOpen(false);
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
          variant="destructive"
          size="sm"
          className="w-24 font-semibold"
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      }
      title={manual ? "Mark as refunded" : `Refund ${formatBaht(amount)}?`}
      description={
        manual
          ? `This payment can't be refunded automatically. Transfer ${formatBaht(amount)} back to ${studentName} (${studentEmail}) yourself, then record the transfer here. Their access to these courses ends.`
          : `The money goes back to ${studentName}'s original payment method and their access to these courses ends. This can't be undone.`
      }
      confirmLabel={manual ? "Mark as refunded" : "Refund payment"}
      destructive
      onConfirm={confirmRefund}
    >
      {manual && (
        <Field className="gap-1.5" data-invalid={!!referenceError}>
          <FieldLabel htmlFor={`refund-reference-${purchaseId}`}>
            Transfer reference
          </FieldLabel>
          <Input
            id={`refund-reference-${purchaseId}`}
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setReferenceError(null);
            }}
            placeholder="Enter reference number"
            maxLength={100}
            aria-invalid={!!referenceError}
            disabled={isPending}
          />
          <FieldError>{referenceError}</FieldError>
        </Field>
      )}
    </ConfirmDialog>
  );
}
