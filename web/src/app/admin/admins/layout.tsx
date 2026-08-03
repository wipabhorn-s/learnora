import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ManageAdminsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return children;
}
