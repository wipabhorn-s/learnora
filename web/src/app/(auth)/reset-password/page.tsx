import ResetPasswordForm from "@/components/features/auth/ResetPasswordForm";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reset Password | Learnora" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-extrabold">Invalid link</h1>
        <p className="text-muted-foreground">
          This password reset link is not valid.
        </p>
        <Link
          href="/forgot-password"
          className="font-medium text-primary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold">Set a new password</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a password you haven&apos;t used before.
        </p>
      </div>

      <ResetPasswordForm token={token} />
    </>
  );
}
