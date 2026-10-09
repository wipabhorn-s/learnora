"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
} from "@/components/ui/combobox";
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
import { type Bank, findBank, THAI_BANKS } from "@/lib/constants/banks";
import {
  type PayoutAccountFormInput,
  payoutAccountSchema,
} from "@/lib/schemas/payout.schema";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

const FIELDS = [
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

/** ค้นได้ทั้งชื่ออังกฤษ ชื่อไทย และรหัสธนาคาร (เช่น "kbank", "กสิกร") */
const matchesBank = (bank: Bank, query: string) => {
  const q = query.trim().toLowerCase();
  return [bank.name, "thaiName" in bank ? bank.thaiName : "", bank.code].some(
    (text) => text.toLowerCase().includes(q),
  );
};

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
  // มีบัญชีแล้ว: แสดงแบบอ่านอย่างเดียว กด Edit ก่อนถึงแก้ได้ (กันแก้พลาดโดยไม่ตั้งใจ)
  // บัญชีเก่าที่ยังไม่มีรหัสธนาคาร เปิดโหมดแก้ไขไว้เลยเพราะต้องเลือกธนาคารใหม่
  const [editing, setEditing] = useState(!account?.bankCode);
  const readOnly = !editing;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PayoutAccountFormInput>({
    resolver: zodResolver(payoutAccountSchema),
    defaultValues: {
      // บัญชีเก่าที่พิมพ์ชื่อธนาคารเอง (ไม่มีรหัส) ต้องเลือกธนาคารใหม่จากรายการ
      bankCode: findBank(account?.bankCode)?.code,
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
      setEditing(false);
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

          <Controller
            control={control}
            name="bankCode"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel required htmlFor="bankCode">
                  Bank
                </FieldLabel>
                <Combobox
                  items={THAI_BANKS}
                  value={findBank(field.value)}
                  onValueChange={(bank: Bank | null) =>
                    field.onChange(bank?.code)
                  }
                  itemToStringLabel={(bank: Bank) => bank.name}
                  itemToStringValue={(bank: Bank) => bank.code}
                  isItemEqualToValue={(bank: Bank, value: Bank) =>
                    bank.code === value.code
                  }
                  filter={matchesBank}
                  // พิมพ์ค้นแล้วกด Enter ได้เลย เลือกรายการแรกที่ตรง
                  autoHighlight
                  readOnly={readOnly}
                  disabled={isPending}
                >
                  <ComboboxInput
                    id="bankCode"
                    name={field.name}
                    placeholder="Search for your bank"
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                  <ComboboxContent emptyText="No banks match your search.">
                    {(bank: Bank) => (
                      <ComboboxItem key={bank.code} value={bank}>
                        <span className="grid">
                          <span>{bank.name}</span>
                          {"thaiName" in bank && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {bank.thaiName}
                            </span>
                          )}
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxContent>
                </Combobox>
                {!account?.bankCode && account?.bankName && (
                  <FieldDescription>
                    Previously entered: {account.bankName}. Please pick it from
                    the list.
                  </FieldDescription>
                )}
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
                    readOnly={readOnly}
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

          {/*
              key แยกทุกปุ่ม: ปุ่ม Edit (type=button) ต้องไม่กลายเป็นปุ่ม submit ตัวเดิม
              ไม่งั้นคลิกเดียวกันนั้นจะส่งฟอร์มทันทีหลังสลับเป็นโหมดแก้ไข
            */}
          {readOnly ? (
            <Button
              key="edit"
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <div className="grid auto-cols-fr grid-flow-col gap-2">
              <Button key="save" type="submit" disabled={isPending || !isDirty}>
                {isPending
                  ? "Saving..."
                  : account
                    ? "Update account"
                    : "Save account"}
              </Button>
              {account?.bankCode && (
                <Button
                  key="cancel"
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    reset();
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </FieldGroup>
      </form>
    </Card>
  );
}
