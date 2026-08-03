import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email | Learnora" };

export default function ForgotPasswordConfirmPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="h-8 w-8 text-primary" />
      </div>

      <div>
        <h1 className="text-3xl font-extrabold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset
          your password. The link expires in 10 minutes.
        </p>
      </div>

      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/login">Back to log in</Link>}
        className="w-full py-5"
      />
    </div>
  );
}
