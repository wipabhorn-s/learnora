"use client";

import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  confirmTwoFactorAction,
  disableTwoFactorAction,
  requestTwoFactorAction,
} from "@/lib/actions/security.action";
import { SecurityOverview } from "@/lib/api/api.type";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Mode = "idle" | "confirm" | "disable";

/**
 * เปิด: ส่งรหัสไปอีเมล → ใส่รหัสถูก → เปิด (พิสูจน์ว่ายังเข้ากล่องเมลได้จริง)
 * ปิด: ต้องใส่รหัสผ่าน กันคนที่ยืมเครื่องที่ล็อกอินค้างไว้แอบปิด
 */
export default function TwoFactorCard({
  security,
}: {
  security: SecurityOverview;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const { secondsLeft, start } = useCooldown();

  const enabled = security.twoFactorEnabled;

  const reset = () => {
    setMode("idle");
    setChallengeId(null);
    setCode("");
    setPassword("");
  };

  const sendCode = () => {
    startTransition(async () => {
      const result = await requestTwoFactorAction();
      toast.result(result);
      if (!result.success) return;

      setChallengeId(result.challengeId);
      setCode("");
      setMode("confirm");
      start(RESEND_COOLDOWN_SECONDS);
    });
  };

  const confirm = (value: string) => {
    if (!challengeId) return;

    startTransition(async () => {
      const result = await confirmTwoFactorAction(challengeId, value);
      toast.result(result);
      if (!result.success) {
        setCode("");
        return;
      }

      reset();
      router.refresh();
    });
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    // ครบ 6 หลักแล้วยืนยันเลย เหมือนขั้นใส่รหัสตอนล็อกอิน
    if (value.length === 6 && !isPending) confirm(value);
  };

  const turnOff = () => {
    startTransition(async () => {
      const result = await disableTwoFactorAction(password);
      toast.result(result);
      if (!result.success) return;

      reset();
      router.refresh();
    });
  };

  // ปุ่มหลักอยู่มุมขวาบนแบบเดียวกับ Disconnect ของการ์ด Connected accounts
  // ระหว่างกรอกรหัสหรือรหัสผ่านซ่อนไว้ ไม่ให้มีปุ่มซ้ำกับในฟอร์ม
  const headerAction =
    !security.hasPassword || mode !== "idle" ? null : enabled ? (
      <Button
        type="button"
        variant="destructive"
        onClick={() => setMode("disable")}
      >
        Turn off
      </Button>
    ) : (
      <Button type="button" onClick={sendCode} disabled={isPending}>
        {isPending ? "Sending code..." : "Turn on"}
      </Button>
    );

  return (
    <Card className="gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Two-step verification</h2>
            <StatusBadge size="sm" tone={enabled ? "success" : "neutral"}>
              {enabled ? "On" : "Off"}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            When you log in with your password, we&apos;ll also ask for a
            6-digit code sent to your email.
            <br />
            Logging in with Google doesn&apos;t need a code.
          </p>
        </div>

        {headerAction}
      </div>

      {!security.hasPassword ? (
        <p className="text-sm text-muted-foreground">
          Set a password above first — two-step verification protects password
          logins.
        </p>
      ) : mode === "confirm" ? (
        <form
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            confirm(code);
          }}
          className="grid gap-3"
        >
          <Field className="gap-2">
            <FieldLabel htmlFor="two-factor-code">
              Enter the code we sent to {security.email}
            </FieldLabel>
            <OtpInput
              id="two-factor-code"
              value={code}
              onChange={handleCodeChange}
              autoFocus
              disabled={isPending}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={isPending || code.length !== 6}
              size="lg"
              className="w-fit"
            >
              {isPending ? "Checking..." : "Turn on"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              disabled={isPending}
              size="lg"
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={sendCode}
              disabled={isPending || secondsLeft > 0}
              className="text-sm font-semibold text-primary tabular-nums hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {secondsLeft > 0
                ? `Resend code in ${secondsLeft}s`
                : "Resend code"}
            </button>
          </div>
        </form>
      ) : mode === "disable" ? (
        <form
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            turnOff();
          }}
          className="grid gap-3"
        >
          <Field className="gap-1">
            <FieldLabel htmlFor="two-factor-password">
              Confirm with your password
            </FieldLabel>
            <PasswordInput
              id="two-factor-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoFocus
              disabled={isPending}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || password.length === 0}
              size="lg"
              className="w-fit"
            >
              {isPending ? "Turning off..." : "Turn off"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              disabled={isPending}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
