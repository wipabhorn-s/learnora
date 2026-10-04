import AuthHeader from "@/components/features/auth/AuthHeader";
import ForgotPasswordForm from "@/components/features/auth/ForgotPasswordForm";
import TextLink from "@/components/shared/TextLink";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Forgot Password | Learnora" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeader
        title="Forgot your password?"
        description="Enter your email and we'll send you a link to reset it."
      />

      <ForgotPasswordForm />

      <p className="text-center text-sm">
        <TextLink href="/login">Back to log in</TextLink>
      </p>
    </>
  );
}
