"use client";

import ChangePasswordForm from "@/components/features/profile/ChangePasswordForm";
import AvatarUploadDialog from "@/components/features/profile/AvatarUploadDialog";
import ProfileInfoForm from "@/components/features/profile/ProfileInfoForm";
import LoginSecurityPanel from "@/components/features/security/LoginSecurityPanel";
import { SecurityOverview } from "@/lib/api/api.type";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

const SECTIONS = [
  { key: "personal", label: "Personal Information" },
  { key: "password", label: "Change Password" },
  { key: "security", label: "Login & Security" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function ProfileView({
  firstName,
  lastName,
  email,
  role,
  avatarUrl,
  security,
}: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  security: SecurityOverview | null;
}) {
  const [section, setSection] = useState<SectionKey>("personal");

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold">Profile</h1>

      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <Card className="flex w-full min-w-0 flex-col items-center gap-4 p-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl ?? undefined} alt={firstName} />
                <AvatarFallback className="bg-primary text-4xl font-extrabold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <AvatarUploadDialog avatarUrl={avatarUrl} firstName={firstName} />
            </div>

            <div className="w-full min-w-0 text-center">
              <div className="break-words font-bold">
                {firstName} {lastName}
              </div>
              <div
                className="truncate text-sm text-muted-foreground"
                title={email}
              >
                {email}
              </div>
              <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize text-primary">
                {role.replace("_", " ").toLowerCase()}
              </span>
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            {SECTIONS.filter(
              // บัญชีที่ยังไม่มีรหัสผ่านจะตั้งรหัสจากแท็บ Login & Security แทน
              (s) => s.key !== "password" || security?.hasPassword !== false,
            ).map((s) => (
              <button
                type="button"
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`h-14 w-full border-b border-border px-5 text-left text-sm font-medium transition-colors last:border-0 ${
                  section === s.key
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </Card>
        </div>

        <div className="min-w-0">
          {section === "personal" && (
            <ProfileInfoForm
              firstName={firstName}
              lastName={lastName}
              email={email}
            />
          )}

          {section === "password" && (
            <ChangePasswordForm onSuccess={() => setSection("personal")} />
          )}

          {section === "security" &&
            (security ? (
              <LoginSecurityPanel security={security} />
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">
                We could not load your security settings right now. Please
                refresh the page.
              </Card>
            ))}
        </div>
      </div>
    </>
  );
}
