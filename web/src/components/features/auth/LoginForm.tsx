"use client";

import GoogleButton from "@/components/features/auth/GoogleButton";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  loginAction,
  resendVerificationAction,
} from "@/lib/actions/auth.action";
import { LoginInput, loginSchema } from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function LoginForm() {
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
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const onSubmit = (data: LoginInput) => {
    startTransition(async () => {
      setResendNotice(null);
      const result = await loginAction(data);

      if (!result) return;

      // เคสนี้แก้ได้ด้วยตัวเอง จึงยื่นปุ่มส่งลิงก์ใหม่ให้ตรงนั้นเลย
      setUnverifiedEmail(
        result.code === "EMAIL_NOT_VERIFIED" ? data.email : null,
      );
      setError("root", { message: result.message });
    });
  };

  const onResend = () => {
    if (!unverifiedEmail) return;

    startTransition(async () => {
      const result = await resendVerificationAction(unverifiedEmail);
      setResendNotice(result.message);
    });
  };

  return (
    <div className="grid gap-6">
      <GoogleButton label="Continue with Google" />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          {errors.root && (
            <Alert
              variant="destructive"
              className="border-destructive bg-destructive/15"
            >
              <AlertCircle />
              <AlertTitle>{errors.root.message}</AlertTitle>
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isPending}
                  className="mt-1 text-left text-sm font-semibold underline underline-offset-2 disabled:opacity-60"
                >
                  Send the verification link again
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
                <FieldLabel htmlFor={field.name}>Email address</FieldLabel>
                <Input
                  placeholder="you@example.com"
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
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  placeholder="Enter your password"
                  type="password"
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
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Field className="gap-1">
            <Button type="submit" disabled={isPending} className="py-5">
              {isPending ? "Logging you in ..." : "Log In"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
