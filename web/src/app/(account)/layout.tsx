import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { auth } from "@/lib/auth";
import { getLastWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

/**
 * หน้าบัญชีที่ใช้ร่วมกันทั้งฝั่งเรียนและฝั่งสอน แสดง sidebar ของพื้นที่ที่
 * ผู้ใช้เพิ่งมา ผู้สอนกด Profile จากฝั่งสอนก็ยังเห็นเมนูฝั่งสอนอยู่ ไม่หลุด
 * ไปฝั่งเรียนเฉย ๆ
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    redirect("/admin/profile");
  }

  const canTeach = session.user.isInstructor;
  const last = await getLastWorkspace();

  return (
    <WorkspaceShell
      workspace={canTeach ? last : "learn"}
      canTeach={canTeach}
      remember={false}
    >
      {children}
    </WorkspaceShell>
  );
}
