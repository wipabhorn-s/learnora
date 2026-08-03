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
import { registerAction } from "@/lib/actions/auth.action";
import { SignupInput, signupSchema } from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function SignupForm({
  initialRole = "STUDENT",
}: {
  initialRole?: "STUDENT" | "INSTRUCTOR";
}) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: initialRole,
    },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: SignupInput) => {
    startTransition(async () => {
      const { confirmPassword, ...input } = data;
      const result = await registerAction(input);
      if (result?.code === "EMAIL_ALREADY_EXISTS") {
        setError("root", { message: result.message });
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* ปุ่มเลือก Student / Instructor */}
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <div className="flex rounded-xl bg-muted p-1">
            {(["STUDENT", "INSTRUCTOR"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => field.onChange(role)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  field.value === role
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {role === "STUDENT"
                  ? "Register as Student"
                  : "Register as Instructor"}
              </button>
            ))}
          </div>
        )}
      />

      <GoogleButton label="Sign up with Google" />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or sign up with email</span>
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

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>First name</FieldLabel>
                  <Input
                    placeholder="Sarah"
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
              name="lastName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
                  <Input
                    placeholder="Chen"
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
          </div>

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
                  placeholder="At least 8 characters"
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                <Input
                  placeholder="Repeat your password"
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

          <Field className="gap-1">
            <Button type="submit" disabled={isPending} className="py-5">
              {isPending ? "Creating account ..." : "Create Account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
