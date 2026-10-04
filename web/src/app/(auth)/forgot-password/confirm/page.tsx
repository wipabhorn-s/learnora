import AuthHeader from "@/components/features/auth/AuthHeader";
import ResendEmailForm from "@/components/features/auth/ResendEmailForm";
import TextLink from "@/components/shared/TextLink";
import { resendPasswordResetAction } from "@/lib/actions/auth.action";
import { readEmailSent } from "@/lib/email-sent-cookie";
import { MailCheck } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email | Learnora" };

export default async function ForgotPasswordConfirmPage() {
  const sent = await readEmailSent("reset");

  return (
    <>
      <AuthHeader
        icon={MailCheck}
        title="Check your email"
        description={
          <>
            If an account exists for{" "}
            {sent ? (
              <span className="font-semibold text-foreground">
                {sent.email}
              </span>
            ) : (
              "that email"
            )}
            , we&apos;ve sent a link to reset your password. The link expires in
            10 minutes.
          </>
        }
      />

      <ResendEmailForm
        defaultEmail={sent?.email ?? ""}
        action={resendPasswordResetAction}
        cooldownSeconds={sent?.cooldownSeconds}
      />

      <p className="text-center text-sm">
        <TextLink href="/login">Back to log in</TextLink>
      </p>
    </>
  );
}
