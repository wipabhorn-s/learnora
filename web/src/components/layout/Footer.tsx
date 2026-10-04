import { auth } from "@/lib/auth";
import { WORKSPACE_HOME } from "@/lib/constants/workspace";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

/**
 * ลิงก์ของผู้สอนตามสถานะผู้ใช้
 * - ยังไม่ล็อกอิน: สมัครเป็นผู้สอน
 * - ล็อกอินแล้วแต่ยังไม่สอน: หน้า Start Teaching (เปิดสิทธิ์สอนได้ทันที บัญชีเดิม)
 * - สอนอยู่แล้ว: เข้าฝั่งสอน
 * - แอดมิน: ไม่แสดง (บัญชีแอดมินสอนไม่ได้)
 */
async function getInstructorLink() {
  const user = (await auth())?.user;
  if (!user) {
    return { href: "/signup?role=INSTRUCTOR", label: "Become an Instructor" };
  }
  if (user.role !== "STUDENT") return null;
  return user.isInstructor
    ? { href: WORKSPACE_HOME.teach, label: "Instructor Dashboard" }
    : { href: "/teach", label: "Become an Instructor" };
}

export default async function Footer() {
  const instructorLink = await getInstructorLink();

  return (
    // หน้าคอร์สบนมือถือมีแถบปุ่มซื้อติดขอบล่างจอ เว้นที่ไว้ไม่ให้บังข้อความลิขสิทธิ์
    <footer className="bg-foreground py-10 text-white/70 max-lg:[body:has([data-sticky-cta])_&]:pb-28">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 md:flex-row">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-lg font-extrabold text-white">
              Learn<span className="text-violet-400">ora</span>
            </span>
          </div>
          <p className="max-w-xs text-sm">
            Expert-led courses with flexible access plans, ready whenever you
            are.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 text-sm">
          <div>
            <h4 className="mb-3 font-semibold text-white">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/courses"
                  className="transition-colors hover:text-white"
                >
                  Courses
                </Link>
              </li>
            </ul>
          </div>
          {instructorLink && (
            <div>
              <h4 className="mb-3 font-semibold text-white">Instructors</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href={instructorLink.href}
                    className="transition-colors hover:text-white"
                  >
                    {instructorLink.label}
                  </Link>
                </li>
              </ul>
            </div>
          )}
          <div>
            <h4 className="mb-3 font-semibold text-white">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-6 pt-6 text-center text-sm">
        © 2026 Learnora. All rights reserved.
      </div>
    </footer>
  );
}
