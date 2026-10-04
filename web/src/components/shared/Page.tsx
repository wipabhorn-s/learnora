import { cn } from "@/lib/utils";

/** ความสูงจอหัก padding บน+ล่างของ <main> ใน AppShell (2/3/4rem ตามขนาดจอ) */
const SCREEN_MIN_H =
  "min-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)]";

/**
 * กรอบหน้าในพื้นที่ที่มี Sidebar (ผู้เรียน ผู้สอน หลังบ้าน) ใช้ตัวนี้ทุกหน้า ความกว้างและระยะห่างจึงเท่ากัน
 * height:
 * - "auto" (ค่าเริ่มต้น) สูงตามเนื้อหา
 * - "fill" สูงอย่างน้อยเต็มจอ ให้การ์ดหน้าว่าง (EmptyState) ยืดเต็มพื้นที่
 * - "fit"  จอใหญ่สูงพอดีจอ ตาราง/รายการข้างในเลื่อนเองแทนทั้งหน้า
 */
export function Page({
  height = "auto",
  className,
  children,
}: {
  height?: "auto" | "fill" | "fit";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6",
        height !== "auto" && SCREEN_MIN_H,
        height === "fit" &&
          "xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** หัวหน้า: ชื่อหน้า + คำอธิบาย และปุ่มหลักชิดขวา (ถ้ามี) */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
