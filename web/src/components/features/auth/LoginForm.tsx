"use client";

import GoogleButton from "@/components/features/auth/GoogleButton";
import LoginCodeStep from "@/components/features/auth/LoginCodeStep";
import TextLink from "@/components/shared/TextLink";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  loginAction,
  resendVerificationAction,
} from "@/lib/actions/auth.action";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { LoginInput, loginSchema } from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function LoginForm({
  initialError = null,
}: {
  initialError?: string | null;
}) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [isPending, startTransition] = useTransition();

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // บัญชีเปิด 2FA: รหัสผ่านถูกแล้ว รอรหัส 6 หลักที่ส่งไปอีเมลนี้
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  // error จาก ?error= (ล็อกอิน Google ไม่ผ่าน) แสดงจนกว่าจะลองล็อกอินใหม่
  const [oauthError, setOauthError] = useState(initialError);

  // ลบ ?error= ออกจาก URL กด refresh หรือแชร์ลิงก์แล้วจะได้ไม่เห็นข้อความเก่าซ้ำ
  useEffect(() => {
    if (initialError) window.history.replaceState(null, "", "/login");
  }, [initialError]);

  const rootError = errors.root?.message ?? oauthError;

  const onSubmit = (data: LoginInput) => {
    setOauthError(null);
    startTransition(async () => {
      setResendNotice(null);
      const result = await loginAction(data);

      if (!result) return;

      if (result.code === "CODE_REQUIRED") {
        setCodeSentTo(data.email);
        return;
      }

      // เคสนี้แก้ได้ด้วยตัวเอง จึงยื่นปุ่มส่งลิงก์ใหม่ให้ตรงนั้นเลย
      setUnverifiedEmail(
        result.code === "EMAIL_NOT_VERIFIED" ? data.email : null,
      );
      setError("root", { message: result.message });
    });
  };

  const { secondsLeft, start } = useCooldown();

  const onResend = () => {
    if (!unverifiedEmail) return;

    startTransition(async () => {
      const result = await resendVerificationAction(unverifiedEmail);
      setResendNotice(result.message);
      if (result.success) start(RESEND_COOLDOWN_SECONDS);
    });
  };

  if (codeSentTo) {
    return (
      <LoginCodeStep email={codeSentTo} onBack={() => setCodeSentTo(null)} />
    );
  }

  return (
    <div className="grid gap-6">
      <GoogleButton label="Continue with Google" />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form method="post" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          {rootError && (
            <Alert
              variant="destructive"
              className="border-destructive bg-destructive/15"
            >
              <AlertCircle />
              <AlertTitle>{rootError}</AlertTitle>
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isPending || secondsLeft > 0}
                  className="mt-1 text-left text-sm font-semibold tabular-nums underline underline-offset-2 disabled:no-underline disabled:opacity-60"
                >
                  {secondsLeft > 0
                    ? `Send the verification link again in ${secondsLeft}s`
                    : "Send the verification link again"}
                </button>
              )}
            </Alert>
          )}

          {resendNotice && (
            <Alert className="border-primary/30 bg-secondary">
              <MailCheck />
              <AlertTitle>{resendNotice}</AlertTitle>
            </Alert>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel required htmlFor={field.name}>
                  Email address
                </FieldLabel>
                <Input
                  placeholder="Enter your email"
                  type="email"
                  id={field.name}
                  {...field}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel required htmlFor={field.name}>
                  Password
                </FieldLabel>
                <PasswordInput
                  placeholder="Enter your password"
                  id={field.name}
                  {...field}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end">
            <TextLink href="/forgot-password" className="text-sm">
              Forgot password?
            </TextLink>
          </div>

          <Field className="gap-1">
            <Button type="submit" disabled={isPending} size="lg">
              {isPending ? "Logging you in..." : "Log In"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
