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
import { loginAction } from "@/lib/actions/auth.action";
import { LoginInput, loginSchema } from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
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

  const onSubmit = (data: LoginInput) => {
    startTransition(async () => {
      const result = await loginAction(data);
      if (result?.code === "INVALID_CREDENTIALS") {
        setError("root", { message: result.message });
      }
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
