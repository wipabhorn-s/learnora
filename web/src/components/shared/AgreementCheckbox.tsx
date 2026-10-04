"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * ช่องติ๊กยอมรับข้อตกลง (หน้าสมัคร, หน้า Start Teaching) ใช้ตัวเดียวกันทั้งเว็บ
 * children = ข้อความพร้อมลิงก์ไปหน้า Terms / Privacy
 */
export default function AgreementCheckbox({
  checked,
  onCheckedChange,
  disabled,
  invalid,
  className,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 text-sm",
        invalid && "text-destructive",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}

/** ลิงก์ในข้อความยอมรับข้อตกลง เปิดแท็บใหม่ ฟอร์มที่กรอกค้างไว้จะได้ไม่หาย */
export function AgreementLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="font-semibold text-primary hover:underline"
    >
      {children}
    </a>
  );
}
