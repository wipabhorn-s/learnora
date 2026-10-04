"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorActionResult } from "@/lib/actions/action.type";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

type ResendResult = { success: true; message: string } | ErrorActionResult;

/**
 * "ไม่ได้รับเมล? ส่งอีกครั้ง" ใช้ร่วมกันทั้งลิงก์ยืนยันอีเมลและลิงก์ตั้งรหัส
 * ใหม่ กดได้ครั้งละ RESEND_COOLDOWN_SECONDS วินาที (API กันซ้ำอีกชั้น)
 */
export default function ResendEmailForm({
  defaultEmail,
  action,
  cooldownSeconds = 0,
}: {
  defaultEmail: string;
  action: (email: string) => Promise<ResendResult>;
  /** วินาทีที่ยังต้องรอ นับจากเมลฉบับล่าสุดที่เพิ่งส่งไปก่อนเปิดหน้านี้ */
  cooldownSeconds?: number;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [isPending, startTransition] = useTransition();
  const { secondsLeft, start } = useCooldown(cooldownSeconds);

  const onResend = () => {
    startTransition(async () => {
      const result = await action(email);
      toast.result(result);
      if (result.success) start(RESEND_COOLDOWN_SECONDS);
    });
  };

  return (
    <div className="grid gap-3">
      <Field className="gap-1">
        <FieldLabel htmlFor="resend-email">
          Didn&apos;t get the email?
        </FieldLabel>
        <Input
          id="resend-email"
          type="email"
          value={email}
          placeholder="Enter your email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="tabular-nums"
        disabled={isPending || email.length === 0 || secondsLeft > 0}
        onClick={onResend}
      >
        {isPending
          ? "Sending..."
          : secondsLeft > 0
            ? `Send the link again in ${secondsLeft}s`
            : "Send the link again"}
      </Button>
    </div>
  );
}
