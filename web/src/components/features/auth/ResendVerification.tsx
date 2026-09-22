"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resendVerificationAction } from "@/lib/actions/auth.action";
import { MailCheck } from "lucide-react";
import { useState, useTransition } from "react";

export default function ResendVerification({
  defaultEmail,
}: {
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onResend = () => {
    startTransition(async () => {
      const result = await resendVerificationAction(email);
      setNotice(result.message);
    });
  };

  return (
    <div className="grid gap-3">
      {notice && (
        <Alert className="border-primary/30 bg-secondary">
          <MailCheck />
          <AlertTitle>{notice}</AlertTitle>
        </Alert>
      )}

      <Field className="gap-1">
        <FieldLabel htmlFor="resend-email">
          Didn&apos;t get the email?
        </FieldLabel>
        <Input
          id="resend-email"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Button
        type="button"
        variant="outline"
        className="py-5"
        disabled={isPending || email.length === 0}
        onClick={onResend}
      >
        {isPending ? "Sending ..." : "Send the link again"}
      </Button>
    </div>
  );
}
