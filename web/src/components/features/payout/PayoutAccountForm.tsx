"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { savePayoutAccountAction } from "@/lib/actions/payout.action";
import type { PayoutAccount } from "@/lib/api/payout.api";
import {
  type PayoutAccountFormInput,
  payoutAccountSchema,
} from "@/lib/schemas/payout.schema";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

const FIELDS = [
  { name: "bankName", label: "Bank name", placeholder: "Enter your bank name" },
  {
    name: "accountName",
    label: "Account holder name",
    placeholder: "Enter the account holder name",
  },
  {
    name: "accountNumber",
    label: "Account number",
    placeholder: "Enter your account number",
  },
] as const;

/** บัญชีธนาคารที่ผู้สอนใช้รับเงิน แอดมินโอนเข้าบัญชีนี้ */
export default function PayoutAccountForm({
  account,
  className,
}: {
  account: PayoutAccount | null;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PayoutAccountFormInput>({
    resolver: zodResolver(payoutAccountSchema),
    defaultValues: {
      bankName: account?.bankName ?? "",
      accountName: account?.accountName ?? "",
      accountNumber: account?.accountNumber ?? "",
    },
  });

  const onSubmit = (data: PayoutAccountFormInput) => {
    startTransition(async () => {
      const result = await savePayoutAccountAction(data);
      toast.result(result);
      if (!result.success) return;

      reset(data);
      router.refresh();
    });
  };

  return (
    <Card className={cn("overflow-y-auto p-6", className)}>
      <form method="post" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4">
          <div>
            <h2 className="font-bold">Payout account</h2>
            <FieldDescription>
              We transfer your earnings to this bank account.
            </FieldDescription>
          </div>

          {FIELDS.map(({ name, label, placeholder }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    {label}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    placeholder={placeholder}
                    inputMode={name === "accountNumber" ? "numeric" : undefined}
                    {...field}
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ))}

          <Button
            type="submit"
            disabled={isPending || !isDirty}
            className="justify-self-start"
          >
            {isPending
              ? "Saving..."
              : account
                ? "Update account"
                : "Save account"}
          </Button>
        </FieldGroup>
      </form>
    </Card>
  );
}
