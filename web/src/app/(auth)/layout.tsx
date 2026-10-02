import AuthHero from "@/components/features/auth/AuthHero";
import { AuthRoleProvider } from "@/components/features/auth/AuthRole";
import Logo from "@/components/shared/Logo";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <AuthRoleProvider>
      {/*
        สูงพอดีจอ (h-dvh) ไม่มีแถบเลื่อนทั้งหน้า
        ถ้าจอเตี้ยมากจนฟอร์มล้น ให้เลื่อนเฉพาะฝั่งฟอร์มแทน (overflow-y-auto)
      */}
      <div className="flex h-dvh overflow-hidden">
        <AuthHero />

        <main className="flex flex-1 overflow-y-auto px-6 py-8 [@media(max-height:700px)]:py-4">
          {/* my-auto: อยู่กลางแนวตั้งเมื่อพอดีจอ และเลื่อนได้ครบเมื่อล้น (ต่างจาก items-center ที่ตัดส่วนบนทิ้ง) */}
          <div className="m-auto w-full max-w-md space-y-6">
            <div className="lg:hidden">
              <Logo />
            </div>
            {children}
          </div>
        </main>
      </div>
    </AuthRoleProvider>
  );
}
