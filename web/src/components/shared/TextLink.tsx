import { cn } from "@/lib/utils";
import Link from "next/link";

/** สไตล์ลิงก์ในเนื้อความ (สีหลัก ขีดเส้นใต้ตอนชี้) ใช้กับ <a>/<button> ที่ไม่ใช่ next/link ได้ด้วย */
export const TEXT_LINK_CLASS = "font-semibold text-primary hover:underline";

/** ลิงก์ในประโยค เช่น "Already have an account? Log in" ใช้ตัวนี้ทั้งเว็บ หน้าตาจึงเหมือนกันทุกที่ */
export default function TextLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(TEXT_LINK_CLASS, className)}>
      {children}
    </Link>
  );
}
