"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePasswordAction } from "@/lib/actions/user.action";
import {
  ChangePasswordFormInput,
  changePasswordSchema,
} from "@/lib/schemas/user.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

type ChangePasswordFormProps = {
  onSuccess: () => void;
};

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current Password",
    placeholder: "Enter current password",
  },
  {
    name: "newPassword",
    label: "New Password",
    placeholder: "Create new password",
  },
  {
    name: "confirmPassword",
    label: "Confirm New Password",
    placeholder: "Repeat new password",
  },
] as const;

export default function ChangePasswordForm({
  onSuccess,
}: ChangePasswordFormProps) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!saved) return;

    const timeoutId = window.setTimeout(() => {
      setSaved(false);
      onSuccess();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [saved, onSuccess]);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ChangePasswordFormInput) => {
    setSaved(false);
    startTransition(async () => {
      const { confirmPassword, ...input } = data;
      const result = await changePasswordAction(input);

      if (result.success) {
        setSaved(true);
        reset();
      } else {
        setError("root", { message: result.message });
      }
    });
  };

  return (
    <Card className="h-full w-full min-w-0 p-6">
      <form className="min-w-0" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <h2 className="font-bold">Change Password</h2>

          {saved && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="text-emerald-600" />
              <AlertTitle className="text-emerald-700">
                Password changed successfully
              </AlertTitle>
            </Alert>
          )}

          {errors.root && (
            <Alert
              variant="destructive"
              className="border-destructive bg-destructive/15"
            >
              <AlertCircle />
              <AlertTitle>{errors.root.message}</AlertTitle>
            </Alert>
          )}

          {FIELDS.map((f) => (
            <Controller
              key={f.name}
              control={control}
              name={f.name}
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{f.label}</FieldLabel>
                  <Input
                    type="password"
                    placeholder={f.placeholder}
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
          ))}

          <Field className="gap-1">
            <Button type="submit" disabled={isPending} className="py-5">
              {isPending ? "Updating ..." : "Update Password"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </Card>
  );
}
