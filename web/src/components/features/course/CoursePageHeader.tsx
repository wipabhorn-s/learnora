import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** หัวหน้าสร้าง/แก้คอร์ส: ลูกศรกลับ My Courses + ชื่อหน้า ใช้ร่วมกันสองหน้า */
export default function CoursePageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7 flex items-center gap-3">
      <Link
        href="/instructor/courses"
        aria-label="Back to My Courses"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft size={20} />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
