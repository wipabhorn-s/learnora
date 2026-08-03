import ForgotPasswordForm from "@/components/features/auth/ForgotPasswordForm";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Forgot Password | Learnora" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold">Forgot your password?</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </>
  );
}
