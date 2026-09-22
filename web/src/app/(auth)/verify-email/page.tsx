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
    : ({
        success: false as const,
        message: "This link is missing its verification token",
        code: "INVALID_TOKEN",
      });

  return (
    <div className="grid gap-6 text-center">
      {result.success ? (
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
      ) : (
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
      )}

      <div>
        <h1 className="text-2xl font-extrabold">
          {result.success ? "You're all set" : "We couldn't verify that link"}
        </h1>
        <p className="mt-2 text-muted-foreground">{result.message}</p>
      </div>

      <Button
        nativeButton={false}
        className="py-5"
        render={
          <Link href={result.success ? "/login" : "/verify-email/sent"}>
            {result.success ? "Log in" : "Get a new link"}
          </Link>
        }
      />
    </div>
  );
}
