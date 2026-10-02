import {
  PASSWORD_CHARSET_RULE,
  PASSWORD_RULES,
} from "@/lib/schemas/password.schema";

const LEVEL_COLOR = ["bg-destructive", "bg-amber-500", "bg-emerald-500"];

/**
 * แถบความแข็งแรง + คำแนะนำบรรทัดเดียว แทน checklist ยาว ๆ บอกเฉพาะข้อแรกที่
 * ยังขาด ผู้ใช้แก้ทีละเรื่องโดยไม่ต้องอ่านทั้งรายการ ช่องว่างอยู่ก็ไม่แสดงอะไร
 */
export default function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;

  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  const total = PASSWORD_RULES.length;
  const charsetOk = PASSWORD_CHARSET_RULE.test(value);
  const nextRule = PASSWORD_RULES.find((rule) => !rule.test(value));
  const strong = charsetOk && !nextRule;

  const level = strong ? 2 : passed >= total - 2 ? 1 : 0;

  return (
    <div className="grid gap-1.5">
      <div className="flex gap-1" aria-hidden>
        {PASSWORD_RULES.map((rule, index) => (
          <span
            key={rule.hint}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < passed ? LEVEL_COLOR[level] : "bg-border"
            }`}
          />
        ))}
      </div>

      <p
        aria-live="polite"
        className={`text-xs ${
          !charsetOk
            ? "text-destructive"
            : strong
              ? "text-emerald-600"
              : "text-muted-foreground"
        }`}
      >
        {!charsetOk
          ? PASSWORD_CHARSET_RULE.hint
          : (nextRule?.hint ?? "Strong password")}
      </p>
    </div>
  );
}
