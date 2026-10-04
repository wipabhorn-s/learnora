import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted | Learnora" };

/** หลังลบบัญชีสำเร็จ (ล็อกเอาต์แล้ว) บอกให้ชัดว่าเกิดอะไรขึ้น */
export default function AccountDeletedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <CheckCircle2 size={48} className="text-emerald-500" />
      <h1 className="text-2xl font-extrabold tracking-tight">
        Your account has been deleted
      </h1>
      <p className="text-muted-foreground">
        Your personal data has been removed and you&apos;ve been signed out.
        Thanks for learning with us.
      </p>
      <Button
        nativeButton={false}
        className="mt-2"
        render={<Link href="/">Back to home</Link>}
      />
    </div>
  );
}
