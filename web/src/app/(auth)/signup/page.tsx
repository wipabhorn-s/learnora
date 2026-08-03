import SignupForm from "@/components/features/auth/SignupForm";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign Up | Learnora" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>

      <SignupForm initialRole={initialRole} />
    </>
  );
}
