"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  size?: "default" | "lg";
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * ช่องรหัสแบบกล่องสี่เหลี่ยมทีละหลัก ข้างใต้เป็น input จริงตัวเดียวที่โปร่งใส
 * วางทับกล่องไว้ ไม่ได้แยกเป็น 6 input เพราะแบบนั้นการวางรหัส, ลบย้อน,
 * autofill รหัสจาก SMS/อีเมล (autocomplete="one-time-code") และ screen reader
 * ต้องเขียนเองทั้งหมดและพังง่าย ส่วนกล่องที่เห็นเป็นแค่ภาพแสดงผล
 */
function OtpInput({
  value,
  onChange,
  length = 6,
  size = "default",
  id,
  disabled,
  invalid,
  autoFocus,
  className,
  "aria-label": ariaLabel = "Verification code",
}: OtpInputProps) {
  const [focused, setFocused] = React.useState(false);
  // กล่องที่กำลังจะพิมพ์ลง (ครบแล้วค้างไว้ที่กล่องสุดท้าย)
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className={cn("relative flex w-fit gap-2", className)}>
      {Array.from({ length }, (_, index) => {
        const char = value[index];
        const isActive = focused && index === activeIndex;

        return (
          <div
            key={index}
            aria-hidden
            className={cn(
              "flex items-center justify-center rounded-xl border border-border bg-muted font-bold transition-[border-color,box-shadow]",
              size === "lg" ? "size-13 text-2xl" : "size-11 text-xl",
              isActive && "border-ring ring-3 ring-ring/50",
              invalid && "border-destructive",
              isActive && invalid && "ring-destructive/20",
              disabled && "opacity-50",
            )}
          >
            {char ??
              (isActive && (
                <span className="h-1/2 w-px animate-pulse bg-foreground" />
              ))}
          </div>
        );
      })}

      <input
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, length))
        }
        // เคอร์เซอร์อยู่ท้ายสุดเสมอ กล่องที่ไฮไลต์จะได้ตรงกับที่พิมพ์ลงจริง
        onSelect={(event) => {
          const input = event.currentTarget;
          input.setSelectionRange(input.value.length, input.value.length);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        // text-base กัน iOS Safari ซูมหน้าจอตอนแตะช่อง
        className="absolute inset-0 size-full cursor-text text-base opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export { OtpInput };
