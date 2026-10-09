"use client";

import PasswordChecklist, {
  PasswordFieldLabel,
} from "@/components/features/auth/PasswordChecklist";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPasswordAction } from "@/lib/actions/auth.action";
import {
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/schemas/auth.schema";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function ResetPasswordForm({ token }: { token: string }) {
  const { control, handleSubmit, clearErrors } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    // ตรวจซ้ำตอนกดส่งเท่านั้น ระหว่างพิมพ์แก้ให้กรอบแดงหายไปก่อน
    reValidateMode: "onSubmit",
    defaultValues: { token, newPassword: "" },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: ResetPasswordInput) => {
    startTransition(async () => {
      const result = await resetPasswordAction(data);
      if (result) toast.error(result.message);
    });
  };

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          control={control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1" data-invalid={fieldState.invalid}>
              <PasswordFieldLabel htmlFor={field.name} value={field.value}>
                New password
              </PasswordFieldLabel>
              <PasswordInput
                placeholder="Create a strong password"
                autoComplete="new-password"
                id={field.name}
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  clearErrors(field.name);
                }}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              <PasswordChecklist value={field.value} />
            </Field>
          )}
        />

        <Field className="gap-1">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
