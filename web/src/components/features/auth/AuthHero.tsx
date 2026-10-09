"use client";

import {
  type AuthRole,
  useAuthRole,
} from "@/components/features/auth/AuthRole";
import LoginHello from "@/components/features/auth/LoginHello";
import NightPanel from "@/components/magic/NightPanel";
import PortraitFrame from "@/components/magic/PortraitFrame";
import Logo from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";

const ROLES: Record<AuthRole, { image: string; title: string; desc: string }> =
  {
    student: {
      image: "/witch/role-student.webp",
      title: "Learn new skills, at your own pace",
      desc: "Access expert-led courses and continue learning anywhere.",
    },
    instructor: {
      image: "/witch/role-instructor.webp",
      title: "Share your knowledge, inspire learners",
      desc: "Create courses, reach students everywhere, and earn from what you know.",
    },
  };

/** หน้าอื่นที่ไม่ใช่หน้าสมัคร (Log in, ลืมรหัสผ่าน ฯลฯ): แม่มดโบกมือทักทาย */
const WELCOME = {
  title: "Welcome back!",
  desc: "Your courses are right where you left them. Log in and keep learning.",
};

/**
 * ฝั่งซ้ายของหน้า (auth): พื้นม่วงดำมีดาว
 * - หน้าสมัคร: ตัวละครตาม role ที่เลือกในฟอร์มสมัคร
 * - หน้าอื่น: แม่มดโบกมือทักทาย (LoginHello)
 * - วางรูปทั้งสองซ้อนกันแล้วสลับแค่ opacity (โหลดไว้ทั้งคู่ สลับแล้วไม่กระพริบ)
 * - รูปมีพื้นหลังขาว จึงใส่ในกรอบวงกลม (PortraitFrame) แบบเดียวกับแม่มดหน้าแรก
 * - หัวข้อ/คำอธิบายเปลี่ยนตาม role (aria-live ให้โปรแกรมอ่านหน้าจอรู้ว่าเปลี่ยน)
 */
export default function AuthHero() {
  const { role } = useAuthRole();
  const onSignup = usePathname()?.startsWith("/signup") ?? false;
  const content = onSignup ? ROLES[role] : WELCOME;

  return (
    <NightPanel
      as="aside"
      className="hidden w-1/2 items-center justify-center p-12 lg:flex"
      stars={{ seed: 21, sparkleRatio: 0.1 }}
    >
      <div className="absolute top-8 left-8">
        <Logo light />
      </div>

      <div className="relative flex max-w-md flex-col items-center text-center text-white">
        {onSignup ? (
          <PortraitFrame className="w-[min(20rem,38dvh)]">
            {(Object.keys(ROLES) as AuthRole[]).map((key) => (
              <Image
                key={key}
                src={ROLES[key].image}
                alt={key === role ? `Learnora ${key} character` : ""}
                aria-hidden={key !== role}
                fill
                priority
                sizes="320px"
                className={cn(
                  "object-cover transition-opacity duration-500 ease-in-out motion-reduce:transition-none",
                  key === role ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </PortraitFrame>
        ) : (
          <LoginHello priority sizes="384px" className="w-[min(24rem,46dvh)]" />
        )}

        <div aria-live="polite" className="mt-8 space-y-3">
          <h2 className="text-3xl leading-tight font-extrabold xl:text-4xl">
            {content.title}
          </h2>
          <p className="leading-relaxed text-violet-100/70">{content.desc}</p>
        </div>
      </div>
    </NightPanel>
  );
}
