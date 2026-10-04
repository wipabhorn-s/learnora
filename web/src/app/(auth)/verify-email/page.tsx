import AuthHeader from "@/components/features/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/lib/actions/auth.action";
import { CheckCircle2, XCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify Email | Learnora" };

/**
 * ลิงก์ในอีเมลชี้มาที่หน้านี้พร้อม ?token= — ยืนยันฝั่ง server ทันทีที่เปิด
 * ผู้ใช้จึงไม่ต้องกดอะไรอีก และ token ไม่เคยโผล่ไปอยู่ในโค้ดฝั่ง client
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const result = token
    ? await verifyEmailAction(token)
    : {
        success: false as const,
        message: "This link is missing its verification token",
        code: "INVALID_TOKEN",
      };

  return (
    <>
      <AuthHeader
        icon={result.success ? CheckCircle2 : XCircle}
        tone={result.success ? "primary" : "destructive"}
        title={
          result.success ? "You're all set" : "We couldn't verify that link"
        }
        description={result.message}
      />

      <Button
        nativeButton={false}
        size="lg"
        className="w-full"
        render={
          <Link href={result.success ? "/login" : "/verify-email/sent"}>
            {result.success ? "Log in" : "Get a new link"}
          </Link>
        }
      />
    </>
  );
}
