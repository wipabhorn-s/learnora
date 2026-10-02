import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  // ยังไม่ได้เปิดสิทธิ์สอน ส่งไปหน้าที่อธิบายและมีปุ่มเปิดให้กดได้เลย
  // ดีกว่าเด้งกลับหน้าแรกแล้วไม่บอกว่าต้องทำอะไร
  if (!session.user.isInstructor) redirect("/teach");

  return (
    <WorkspaceShell workspace="teach" canTeach>
      {children}
    </WorkspaceShell>
  );
}
