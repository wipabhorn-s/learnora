"use client";

import AvatarUploadDialog from "@/components/features/profile/AvatarUploadDialog";
import ProfileInfoForm from "@/components/features/profile/ProfileInfoForm";
import LoginSecurityPanel from "@/components/features/security/LoginSecurityPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { SecurityOverview } from "@/lib/api/api.type";
import { useState } from "react";

const SECTIONS = [
  { key: "personal", label: "Personal Information" },
  { key: "security", label: "Login & Security" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function ProfileView({
  firstName,
  lastName,
  email,
  role,
  isInstructor,
  bio,
  avatarUrl,
  security,
}: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isInstructor: boolean;
  bio: string | null;
  avatarUrl: string | null;
  security: SecurityOverview | null;
}) {
  const [section, setSection] = useState<SectionKey>("personal");

  return (
    /*
      จอกว้าง: ล็อกความสูงหน้าไว้เท่าจอ แล้วให้เลื่อนเฉพาะคอลัมน์ฟอร์มด้านขวา
      หัวข้อ Profile กับการ์ดซ้ายจึงอยู่กับที่เองโดยไม่ต้องใช้ fixed/sticky
      (แบบเดียวกับหน้า Wishlist / My Courses) จอแคบเลื่อนทั้งหน้าตามปกติ
    */
    <div className="flex min-w-0 flex-col xl:h-[calc(100dvh-4rem)]">
      <h1 className="mb-6 shrink-0 text-2xl font-extrabold">Profile</h1>

      <div className="grid w-full min-w-0 gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="space-y-3">
            <Card className="flex w-full min-w-0 flex-col items-center gap-4 p-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl ?? undefined} alt={firstName} />
                  <AvatarFallback className="bg-primary text-4xl font-extrabold text-white">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <AvatarUploadDialog
                  avatarUrl={avatarUrl}
                  firstName={firstName}
                />
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
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize text-primary">
                    {role.replace("_", " ").toLowerCase()}
                  </span>
                  {isInstructor && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
                      Instructor
                    </span>
                  )}
                </div>
              </div>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
              {/* รหัสผ่าน (ตั้ง/เปลี่ยน) อยู่ในแท็บ Login & Security กับวิธีล็อกอินอื่น */}
              {SECTIONS.map((s) => (
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
        </div>

        {/* -mr-8/pr-8 ดันแถบเลื่อนไปชิดขอบจอ -mb-8/pb-8 ให้เลื่อนได้ถึงขอบล่าง */}
        <div className="min-w-0 xl:-mr-8 xl:-mb-8 xl:overflow-y-auto xl:pr-8 xl:pb-8">
          {section === "personal" && (
            <ProfileInfoForm
              firstName={firstName}
              lastName={lastName}
              email={email}
              // ช่อง bio มีเฉพาะผู้สอน เพราะแสดงในหน้าคอร์สเท่านั้น
              bio={isInstructor ? (bio ?? "") : undefined}
            />
          )}

          {section === "security" &&
            (security ? (
              <LoginSecurityPanel
                security={security}
                canDeleteAccount={role === "STUDENT"}
              />
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">
                We could not load your security settings right now. Please
                refresh the page.
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
