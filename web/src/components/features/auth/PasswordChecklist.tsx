import { FieldLabel } from "@/components/ui/field";
import {
  PASSWORD_CHARSET_RULE,
  PASSWORD_RULES,
} from "@/lib/schemas/password.schema";
import { cn } from "@/lib/utils";

/** ระดับความแข็งแรง ไล่สีจากแดงไปเขียวตามจำนวนกฎที่ผ่าน */
const LEVELS = [
  { label: "Weak", className: "bg-destructive/10 text-destructive" },
  { label: "Fair", className: "bg-orange-500/10 text-orange-600" },
  { label: "Good", className: "bg-amber-500/15 text-amber-700" },
  { label: "Strong", className: "bg-emerald-500/15 text-emerald-700" },
] as const;

function strengthOf(value: string) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  const charsetOk = PASSWORD_CHARSET_RULE.test(value);
  const nextRule = PASSWORD_RULES.find((rule) => !rule.test(value));
  const strong = charsetOk && !nextRule;

  // ผ่านไม่ถึง 3 ข้อ = Weak, ขาด 2 ข้อ = Fair, ขาดข้อเดียว = Good
  const level = strong
    ? 3
    : !charsetOk
      ? 0
      : Math.max(0, passed - PASSWORD_RULES.length + 3);

  return { level, charsetOk, nextRule, strong };
}

/**
 * ป้ายเล็กมุมขวาบนของช่องรหัสผ่าน บอกระดับความแข็งแรงเป็นคำ + สี
 * ช่องว่างอยู่ก็ไม่แสดงอะไร
 */
export function PasswordStrengthBadge({ value }: { value: string }) {
  if (!value) return null;

  const { label, className } = LEVELS[strengthOf(value).level];

  return (
    <span
      aria-live="polite"
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
        className,
      )}
    >
      <span className="sr-only">Password strength: </span>
      {label}
    </span>
  );
}

/** หัวช่องรหัสผ่านใหม่: ชื่อช่องชิดซ้าย ป้ายความแข็งแรงชิดขวา */
export function PasswordFieldLabel({
  htmlFor,
  value,
  required,
  children,
}: {
  htmlFor: string;
  value: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <FieldLabel required={required} htmlFor={htmlFor}>
        {children}
      </FieldLabel>
      <PasswordStrengthBadge value={value} />
    </div>
  );
}

/**
 * คำแนะนำบรรทัดเดียวใต้ช่อง บอกเฉพาะข้อแรกที่ยังขาด ผู้ใช้แก้ทีละเรื่อง
 * ผ่านครบแล้วไม่แสดง (ป้ายด้านบนขึ้น Strong แทน)
 */
export default function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;

  const { charsetOk, nextRule, strong } = strengthOf(value);
  if (strong) return null;

  return (
    <p
      className={cn(
        "text-xs",
        charsetOk ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {charsetOk ? nextRule?.hint : PASSWORD_CHARSET_RULE.hint}
    </p>
  );
}
