import AuthHeader from "@/components/features/auth/AuthHeader";
import ResendEmailForm from "@/components/features/auth/ResendEmailForm";
import TextLink from "@/components/shared/TextLink";
import { resendVerificationAction } from "@/lib/actions/auth.action";
import { readEmailSent } from "@/lib/email-sent-cookie";
import { MailCheck } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Check your inbox | Learnora" };

export default async function VerificationSentPage() {
  // ไม่มีคุกกี้ = มาจากลิงก์ยืนยันที่หมดอายุ หรือเกิน 10 นาทีแล้ว
  // ให้พิมพ์อีเมลเองแล้วกดส่งได้ทันที
  const sent = await readEmailSent("verify");

  return (
    <>
      <AuthHeader
        icon={MailCheck}
        title="Check your inbox"
        description={
          sent ? (
            <>
              We sent a verification link to{" "}
              <span className="font-semibold text-foreground">
                {sent.email}
              </span>
              . Click it to activate your account.
            </>
          ) : (
            "We sent you a verification link. Click it to activate your account."
          )
        }
      />

      <ResendEmailForm
        defaultEmail={sent?.email ?? ""}
        action={resendVerificationAction}
        cooldownSeconds={sent?.cooldownSeconds}
      />

      <p className="text-center text-sm text-muted-foreground">
        Already verified? <TextLink href="/login">Log in</TextLink>
      </p>
    </>
  );
}
