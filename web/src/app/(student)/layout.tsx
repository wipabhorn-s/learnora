import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  return (
    <WorkspaceShell workspace="learn" canTeach={session.user.isInstructor}>
      {children}
    </WorkspaceShell>
  );
}
