import ProfileView from "@/components/features/profile/ProfileView";
import { getSecurityOverviewAction } from "@/lib/actions/security.action";
import { AuthApi } from "@/lib/api/auth.api";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Profile | Learnora" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { firstName, lastName, email, role, isInstructor, avatarUrl } =
    session.user;
  // bio ไม่ได้อยู่ใน session ดึงสดเฉพาะผู้สอน (คนอื่นไม่เห็นช่องนี้)
  const [security, profile] = await Promise.all([
    getSecurityOverviewAction(),
    isInstructor ? AuthApi.getProfile(session.user.access_token) : null,
  ]);

  return (
    <ProfileView
      firstName={firstName}
      lastName={lastName}
      email={email}
      role={role}
      isInstructor={isInstructor}
      bio={profile?.bio ?? null}
      avatarUrl={avatarUrl}
      security={security}
    />
  );
}
