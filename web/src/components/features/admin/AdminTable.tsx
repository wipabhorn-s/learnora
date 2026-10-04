import EmptyState from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type AdminColumn = {
  label: string;
  align?: "left" | "center" | "right";
};

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center justify-self-center",
  right: "text-right justify-self-end",
};

/**
 * ตารางหลังบ้านทุกหน้าใช้ตัวนี้ หัวตารางติดด้านบนตอนเลื่อน และสไตล์เดียวกับ
 * ตารางคอร์สฝั่งผู้สอน ไม่มีข้อมูลก็แสดง EmptyState ตัวเดียวกับฝั่งผู้เรียน
 *
 * template คือ grid-template-columns ส่งผ่าน style เพราะ Tailwind สร้าง class
 * จากค่าที่ประกอบขึ้นตอนรันไม่ได้
 */
export default function AdminTable<T>({
  columns,
  template,
  rows,
  getKey,
  renderRow,
  empty,
}: {
  columns: AdminColumn[];
  template: string;
  rows: T[];
  getKey: (row: T) => string | number;
  /** คืนเซลล์เรียงตาม columns */
  renderRow: (row: T) => React.ReactNode[];
  empty: { icon: LucideIcon; title: string; description: string };
}) {
  if (rows.length === 0) {
    return <EmptyState {...empty} className="min-h-96" />;
  }

  const gridClass = "grid items-center gap-4 px-6";

  return (
    <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
      <div className="h-full overflow-auto">
        <div className="min-w-[900px]">
          <div
            className={cn(
              gridClass,
              "sticky top-0 z-10 border-b bg-card py-3 text-xs font-bold tracking-wide text-muted-foreground uppercase",
            )}
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((column) => (
              <span
                key={column.label}
                className={ALIGN_CLASS[column.align ?? "left"]}
              >
                {column.label}
              </span>
            ))}
          </div>

          <div className="divide-y">
            {rows.map((row) => (
              <div
                key={getKey(row)}
                className={cn(gridClass, "min-h-18 py-3 text-sm")}
                style={{ gridTemplateColumns: template }}
              >
                {renderRow(row).map((cell, index) => (
                  <div
                    key={columns[index]?.label ?? index}
                    className={cn(
                      "min-w-0",
                      ALIGN_CLASS[columns[index]?.align ?? "left"],
                    )}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** เซลล์แรกของแถว: ชื่อตัวหนา + บรรทัดรองสีจาง (อีเมล, ผู้สอน, คอร์สที่ซื้อ) */
export function PrimaryCell({
  title,
  subtitle,
  code,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** รหัสอ้างอิง (เช่นเลขคำสั่งซื้อ) แสดงตัวเล็กแบบ monospace */
  code?: string;
}) {
  return (
    <>
      <p className="truncate font-semibold">{title}</p>
      {subtitle && (
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      )}
      {code && (
        <p className="truncate font-mono text-xs text-muted-foreground">
          {code}
        </p>
      )}
    </>
  );
}
