import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-border bg-muted text-muted-foreground",
};

/** สีของสถานะที่ใช้ซ้ำหลายหน้า (ประวัติการซื้อ, หลังบ้าน) ให้ความหมายสีตรงกันทั้งเว็บ */
export const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = {
  SUCCESS: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export const COURSE_STATUS_TONE: Record<string, BadgeTone> = {
  PUBLISHED: "success",
  DRAFT: "warning",
  SUSPENDED: "danger",
  DELETED: "neutral",
};

/**
 * ป้ายสถานะทรงเม็ดยา ใช้ตัวเดียวทั้งเว็บ ขนาดตัวอักษรและสีจึงเท่ากันทุกหน้า
 * size="sm" สำหรับป้ายเล็กข้างหัวข้อ (เช่น On/Off, Connected)
 */
export default function StatusBadge({
  tone = "neutral",
  size = "default",
  className,
  children,
}: {
  tone?: BadgeTone;
  size?: "default" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
        size === "sm" ? "px-2 py-0.5" : "h-7 min-w-20 px-3",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
