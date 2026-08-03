import ProfileView from "@/components/features/profile/ProfileView";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Profile | Learnora" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { firstName, lastName, email, role, avatarUrl } = session.user;

  return (
    <ProfileView
      firstName={firstName}
      lastName={lastName}
      email={email}
      role={role}
      avatarUrl={avatarUrl}
    />
  );
}
