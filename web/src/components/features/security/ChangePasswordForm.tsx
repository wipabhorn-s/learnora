"use client";

import PasswordChecklist from "@/components/features/auth/PasswordChecklist";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction } from "@/lib/actions/user.action";
import {
  ChangePasswordFormInput,
  changePasswordSchema,
} from "@/lib/schemas/user.schema";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    placeholder: "Enter current password",
  },
  {
    name: "newPassword",
    label: "New password",
    placeholder: "Create new password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    placeholder: "Repeat new password",
  },
] as const;

/** เนื้อในการ์ด Password ของหน้า Login & Security สำหรับบัญชีที่มีรหัสแล้ว */
export default function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();

  const { control, handleSubmit, reset, clearErrors } =
    useForm<ChangePasswordFormInput>({
      resolver: zodResolver(changePasswordSchema),
      // ตรวจซ้ำตอนกดส่งเท่านั้น ระหว่างพิมพ์แก้ให้กรอบแดงหายไปก่อน
      reValidateMode: "onSubmit",
      defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
    });

  const onSubmit = (data: ChangePasswordFormInput) => {
    startTransition(async () => {
      const { confirmPassword, ...input } = data;
      const result = await changePasswordAction(input);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Password changed successfully");
      reset();
    });
  };

  return (
    <form method="post" className="min-w-0" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        {FIELDS.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel required htmlFor={field.name}>
                  {f.label}
                </FieldLabel>
                <PasswordInput
                  placeholder={f.placeholder}
                  id={field.name}
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    // รหัสใหม่กับยืนยันผูกกันอยู่ แก้ช่องไหนก็ล้างทั้งคู่
                    clearErrors(
                      field.name === "currentPassword"
                        ? field.name
                        : ["newPassword", "confirmPassword"],
                    );
                  }}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
                {field.name === "newPassword" && (
                  <PasswordChecklist value={field.value} />
                )}
              </Field>
            )}
          />
        ))}

        <Button type="submit" disabled={isPending} size="lg" className="w-fit">
          {isPending ? "Updating..." : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
