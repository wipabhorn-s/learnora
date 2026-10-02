import AuthHeader from "@/components/features/auth/AuthHeader";
import ResetPasswordForm from "@/components/features/auth/ResetPasswordForm";
import TextLink from "@/components/shared/TextLink";
import { LinkIcon } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Reset Password | Learnora" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <AuthHeader
          icon={LinkIcon}
          tone="destructive"
          title="Invalid link"
          description="This password reset link is not valid."
        />
        <p className="text-center text-sm">
          <TextLink href="/forgot-password">Request a new link</TextLink>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title="Set a new password"
        description="Choose a password you haven't used before."
      />

      <ResetPasswordForm token={token} />
    </>
  );
}
