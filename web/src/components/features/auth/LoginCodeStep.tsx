"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import {
  cancelLoginCodeAction,
  resendLoginCodeAction,
  verifyLoginCodeAction,
} from "@/lib/actions/auth.action";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { AlertCircle, MailCheck } from "lucide-react";
import { useState, useTransition } from "react";

const CODE_LENGTH = 6;

/**
 * ขั้นที่ 2 ของการล็อกอินเมื่อเปิด 2FA หน้า login ไม่ใช้ toast (ตามที่ตกลงไว้)
 * ข้อความผิดพลาดและผลการส่งรหัสใหม่จึงแสดงในฟอร์มเหมือนขั้นรหัสผ่าน
 */
export default function LoginCodeStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // รหัสเพิ่งถูกส่งไปตอนกด Log In จึงเริ่มนับถอยหลังทันที
  const { secondsLeft, start } = useCooldown(RESEND_COOLDOWN_SECONDS);

  const verify = (value: string) => {
    setNotice(null);
    startTransition(async () => {
      // สำเร็จแล้ว action จะ redirect เอง ถึงบรรทัดถัดไปแปลว่าไม่ผ่าน
      const result = await verifyLoginCodeAction(value);
      if (!result) return;

      setError(result.message);
      setCode("");
      if (result.code === "OTP_SESSION_EXPIRED") onBack();
    });
  };

  const handleChange = (digits: string) => {
    setCode(digits);
    setError(null);

    // ครบ 6 หลักแล้วส่งเลย ไม่ต้องกดปุ่ม (วางรหัสจากเมลได้ทีเดียวจบ)
    if (digits.length === CODE_LENGTH && !isPending) verify(digits);
  };

  const resend = () => {
    setError(null);
    startTransition(async () => {
      const result = await resendLoginCodeAction();
      if (result.success) {
        setNotice(result.message);
        start(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.message);
        if (result.code === "OTP_SESSION_EXPIRED") onBack();
      }
    });
  };

  const back = () => {
    startTransition(async () => {
      await cancelLoginCodeAction();
      onBack();
    });
  };

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
      className="grid gap-5"
    >
      <div className="grid gap-2 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h2 className="text-xl font-extrabold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">{email}</span>. It
          expires in 10 minutes.
        </p>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="border-destructive bg-destructive/15"
        >
          <AlertCircle />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {notice && (
        <Alert className="border-primary/30 bg-secondary">
          <MailCheck />
          <AlertTitle>{notice}</AlertTitle>
        </Alert>
      )}

      <Field className="gap-1.5">
        <FieldLabel htmlFor="login-code" className="sr-only">
          Verification code
        </FieldLabel>
        <OtpInput
          id="login-code"
          value={code}
          onChange={handleChange}
          size="lg"
          autoFocus
          disabled={isPending}
          invalid={error !== null}
          // Field บังคับลูกทุกตัวเป็น w-full ไว้ mx-auto จึงไม่มีผล ต้องจัดกลางด้วย justify
          className="justify-center"
        />
      </Field>

      <Button
        type="submit"
        disabled={isPending || code.length !== CODE_LENGTH}
        size="lg"
      >
        {isPending ? "Verifying..." : "Verify and log in"}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={back}
          disabled={isPending}
          className="font-medium text-muted-foreground hover:text-foreground"
        >
          ← Use a different account
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={isPending || secondsLeft > 0}
          className="font-semibold text-primary tabular-nums hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
