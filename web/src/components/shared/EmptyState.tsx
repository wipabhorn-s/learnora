import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type EmptyStateAction = { label: string; href: string; icon?: LucideIcon };

/**
 * ปุ่มหลักตัวใหญ่กลางการ์ด ใช้ร่วมกับหน้าอื่นที่อยากได้ปุ่มขนาดเดียวกัน
 * (เช่น Become an instructor) ต้องผ่าน cn() เสมอ ไม่งั้น text-sm ของปุ่มชนะ
 */
export const CTA_CLASS = "h-12 rounded-xl px-9 text-base font-semibold";

/** ปุ่มที่ใช้บ่อยที่สุดในหน้าว่างฝั่งผู้เรียน */
export const BROWSE_COURSES: EmptyStateAction = {
  label: "Browse Courses",
  href: "/courses",
};

/**
 * หน้าว่าง ("ยังไม่มีคอร์ส", "ตะกร้าว่าง" ฯลฯ) ใช้ตัวนี้ทุกหน้า ไอคอน ขนาดตัวอักษร
 * และปุ่มจึงเท่ากันหมด ขนาดความสูงให้หน้าที่เรียกกำหนดผ่าน className
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** ปุ่มที่ไม่ใช่ลิงก์ เช่นปุ่มที่เรียก server action วางแทน action ได้ */
  children?: React.ReactNode;
  className?: string;
}) {
  const ActionIcon = action?.icon;

  return (
    <Card
      className={cn(
        "flex-1 items-center justify-center gap-0 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-6 flex size-28 items-center justify-center rounded-full bg-secondary">
        <Icon size={60} className="text-primary/70" />
      </div>

      <h2 className="text-2xl font-extrabold">{title}</h2>

      {description && (
        <p className="mt-3 text-base text-muted-foreground">{description}</p>
      )}

      {action && (
        <Link
          href={action.href}
          // cn() ให้ text-base ทับ text-sm ของปุ่มได้จริง ส่ง className เข้า
          // buttonVariants ตรง ๆ คลาสจะชนกันแล้ว text-sm ชนะ ปุ่มแต่ละหน้าเลยไม่เท่ากัน
          className={cn(buttonVariants(), "mt-8", CTA_CLASS)}
        >
          {ActionIcon && <ActionIcon />}
          {action.label}
        </Link>
      )}

      {children && <div className="mt-8">{children}</div>}
    </Card>
  );
}
