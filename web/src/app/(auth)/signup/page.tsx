import AuthHeader from "@/components/features/auth/AuthHeader";
import SignupForm from "@/components/features/auth/SignupForm";
import TextLink from "@/components/shared/TextLink";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Sign Up | Learnora" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;

  return (
    <>
      <AuthHeader
        title="Create your account"
        description={
          <>
            Already have an account? <TextLink href="/login">Log in</TextLink>
          </>
        }
      />

      <SignupForm initialAsInstructor={role === "INSTRUCTOR"} />
    </>
  );
}
