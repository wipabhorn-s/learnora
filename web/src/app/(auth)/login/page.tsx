import LoginForm from "@/components/features/auth/LoginForm";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Log In | Learnora" };

export default function LoginPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-extrabold">Log in to Learnora</h1>
        <p className="mt-2 text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Sign up free
          </Link>
        </p>
      </div>

      <LoginForm />
    </>
  );
}
