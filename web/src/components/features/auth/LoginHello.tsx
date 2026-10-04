import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * แม่มดโบกมือทักทาย (หน้า Log in) ลอยขึ้นลงเบา ๆ มีแสงม่วงนวลอยู่ด้านหลัง
 * - รูปเป็นแบบพื้นหลังโปร่งใส (login-hello-cutout.png ทำจาก login-hello.png)
 * - ชายเสื้อในรูปเดิมโดนตัดตรง ๆ จึงไล่จางขอบล่างด้วย mask ให้กลืนกับพื้น
 * - ลอยด้วย animate-witch-float (หยุดเมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว)
 * className กำหนดขนาด เช่น "w-80"
 */
export default function LoginHello({
  className,
  sizes,
  priority = false,
}: {
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative aspect-square", className)}>
      {/* แสงม่วงนวลด้านหลัง (radial gradient เบลอ) */}
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(168_85_247/0.55)_0%,rgb(139_92_246/0.25)_45%,transparent_70%)] blur-2xl"
      />
      <div className="animate-witch-float relative size-full">
        <Image
          src="/witch/login-hello-cutout.png"
          alt="Learnora's witch waving hello"
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
        />
      </div>
    </div>
  );
}
