import { cn } from "@/lib/utils";

/**
 * กรอบวงกลมเรืองแสงสำหรับรูปตัวละคร (แม่มดหน้าแรก, ตัวละครเลือก role หน้าสมัคร)
 * ลอยขึ้นลงช้า ๆ ตลอด (หยุดเมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว)
 * children = รูปที่วางซ้อนกันด้วย next/image แบบ fill แล้วสลับ opacity เอง
 * className กำหนดขนาด เช่น "w-full max-w-[20rem]"
 */
export default function PortraitFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("animate-witch-float relative aspect-square", className)}
    >
      {/* แสงเรืองรอบกรอบ */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-full bg-gradient-to-br from-violet-400/40 via-fuchsia-300/30 to-amber-200/40 blur-2xl"
      />
      <div className="relative size-full overflow-hidden rounded-full bg-white shadow-2xl shadow-violet-500/30 ring-4 ring-white/80">
        {children}
      </div>
    </div>
  );
}
