import ResendVerification from "@/components/features/auth/ResendVerification";
import { MailCheck } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your inbox | Learnora" };

export default async function VerificationSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-extrabold">Check your inbox</h1>
        <p className="mt-2 text-muted-foreground">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              Click it to activate your account.
            </>
          ) : (
            "We sent you a verification link. Click it to activate your account."
          )}
        </p>
      </div>

      <ResendVerification defaultEmail={email ?? ""} />

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
