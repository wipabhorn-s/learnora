import { cn } from "@/lib/utils";

/**
 * ปุ่มเลือกหนึ่งในไม่กี่ตัวเลือก (แบบแท็บเม็ดยา) เช่น Student / Instructor, Free / Paid, Lessons / Details
 * fullWidth: ปุ่มแบ่งความกว้างเท่ากันเต็มแถว ไม่ใส่ = กว้างตามข้อความ
 */
export function SegmentedControl<T extends string | boolean>({
  options,
  value,
  onChange,
  disabled,
  fullWidth = false,
  className,
}: {
  options: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-11 gap-1 rounded-xl bg-muted p-1",
        fullWidth ? "grid auto-cols-fr grid-flow-col" : "inline-flex w-fit",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-lg px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed",
            value === option.value
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
