"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/actions/auth.action";
import {
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function ResetPasswordForm({ token }: { token: string }) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: "" },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: ResetPasswordInput) => {
    startTransition(async () => {
      const result = await resetPasswordAction(data);
      if (result) setError("root", { message: result.message });
    });
  };

  return (
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
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>New password</FieldLabel>
              <Input
                placeholder="At least 8 characters"
                type="password"
                id={field.name}
                {...field}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field className="gap-1">
          <Button type="submit" disabled={isPending} className="py-5">
            {isPending ? "Resetting ..." : "Reset password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
