import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * หัวข้อของทุกหน้าใน (auth): ชื่อหน้า + คำอธิบาย
 * มีไอคอน (เช่นหน้า "เช็กอีเมล") จะจัดกึ่งกลาง ไม่มีไอคอนชิดซ้ายตามฟอร์ม
 * tone="destructive" ใช้กับหน้าที่บอกว่าทำไม่สำเร็จ (ไอคอนสีแดง)
 */
export default function AuthHeader({
  title,
  description,
  icon: Icon,
  tone = "primary",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "destructive";
}) {
  return (
    <div className={Icon ? "text-center" : undefined}>
      {Icon && (
        <div
          className={cn(
            "mx-auto mb-4 flex size-16 items-center justify-center rounded-full",
            tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <Icon className="size-8" />
        </div>
      )}
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
