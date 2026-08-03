"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/lib/actions/auth.action";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function ForgotPasswordForm() {
  const { control, handleSubmit } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: ForgotPasswordInput) => {
    startTransition(async () => {
      await forgotPasswordAction(data);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field className="gap-1">
          <Button type="submit" disabled={isPending} className="py-5">
            {isPending ? "Sending ..." : "Send reset link"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
