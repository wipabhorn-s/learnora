"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { rejectRefundRequestAction } from "@/lib/actions/admin.action";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

const MAX_NOTE = 1000;

/** ปฏิเสธคำขอคืนเงิน ต้องบอกเหตุผล นักเรียนเห็นข้อความนี้ในเว็บและในอีเมล */
export default function RejectRefundButton({
  requestId,
  studentName,
}: {
  requestId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!note.trim()) {
      setError("Tell the student why the request was declined");
      return;
    }

    startTransition(async () => {
      const result = await rejectRefundRequestAction(requestId, note);
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
          variant="outline"
          size="sm"
          className="w-24 font-semibold"
          onClick={() => setOpen(true)}
        >
          Decline
        </Button>
      }
      title="Decline this refund request?"
      description={
        <>
          {studentName} keeps access to the courses and no money is returned.
          They&apos;ll see your reason on their purchase history and in an
          email.
        </>
      }
      confirmLabel="Decline request"
      destructive
      onConfirm={submit}
    >
      <Field className="gap-1.5" data-invalid={!!error}>
        <FieldLabel htmlFor={`reject-note-${requestId}`}>
          Reason for the student
        </FieldLabel>
        <Textarea
          id={`reject-note-${requestId}`}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setError(null);
          }}
          rows={4}
          maxLength={MAX_NOTE}
          placeholder="Enter your reason"
          aria-invalid={!!error}
          disabled={isPending}
          className="min-h-24 resize-y"
        />
        <FieldError>{error}</FieldError>
      </Field>
    </ConfirmDialog>
  );
}
