"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  deleteAccountAction,
  requestDeleteCodeAction,
} from "@/lib/actions/security.action";
import type { SecurityOverview } from "@/lib/api/api.type";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

/**
 * ลบบัญชีถาวร ยืนยันตัวตน 2 แบบ
 * 1. มีรหัสผ่าน: ใส่รหัสผ่าน
 * 2. ไม่มีรหัสผ่าน (เข้าทาง Google): พิมพ์อีเมลของบัญชี → รับรหัส 6 หลักทางอีเมล → กรอกรหัส
 */
export default function DeleteAccountCard({
  security,
}: {
  security: SecurityOverview;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { secondsLeft, start } = useCooldown();
  const usePassword = security.hasPassword;

  const reset = () => {
    setPassword("");
    setEmail("");
    setChallengeId(null);
    setCode("");
    setError(null);
  };

  const sendCode = () => {
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }

    startTransition(async () => {
      const result = await requestDeleteCodeAction(email);
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      setChallengeId(result.challengeId);
      setCode("");
      setError(null);
      start(RESEND_COOLDOWN_SECONDS);
    });
  };

  const confirmDelete = () => {
    if (usePassword ? !password : code.length !== 6) {
      setError(
        usePassword
          ? "Enter your password"
          : "Enter the 6-digit code from your email",
      );
      return;
    }

    startTransition(async () => {
      // สำเร็จจะ redirect ไปหน้ายืนยัน ได้ค่ากลับมาเฉพาะตอนผิดพลาด
      const result = await deleteAccountAction(
        usePassword ? { password } : { challengeId: challengeId!, code },
      );
      if (result && !result.success) {
        setError(result.message);
        if (!usePassword) setCode("");
      }
    });
  };

  // บัญชี Google ยังไม่ได้ขอรหัส = ขั้นแรก (พิมพ์อีเมล)
  const awaitingCode = !usePassword && challengeId === null;

  return (
    <Card className="gap-4 border-red-200 p-6">
      <div>
        <h2 className="font-bold text-red-700">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and personal data. This can&apos;t be
          undone.
        </p>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending) return;
          setOpen(nextOpen);
          reset();
        }}
      >
        <Button
          type="button"
          variant="destructive"
          className="justify-self-start"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </Button>

        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone. Here&apos;s what happens:
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Your name, email, password, photo and bio are deleted, and
              you&apos;re signed out everywhere.
            </li>
            <li>
              You lose access to every course you bought. Your cart, wishlist
              and progress are deleted.
            </li>
            <li>
              Receipts of past payments are kept without your name, as required
              for accounting.
            </li>
            <li>You can sign up again later with the same email.</li>
          </ul>

          <form
            method="post"
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (awaitingCode) sendCode();
              else confirmDelete();
            }}
          >
            {usePassword ? (
              <Field className="gap-1.5" data-invalid={!!error}>
                <FieldLabel htmlFor="delete-account-password">
                  Enter your password to confirm
                </FieldLabel>
                <PasswordInput
                  id="delete-account-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  disabled={isPending}
                />
                <FieldError>{error}</FieldError>
              </Field>
            ) : awaitingCode ? (
              <Field className="gap-1.5" data-invalid={!!error}>
                <FieldLabel htmlFor="delete-account-email">
                  Enter your account email to get a confirmation code
                </FieldLabel>
                <Input
                  id="delete-account-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email"
                  autoComplete="email"
                  aria-invalid={!!error}
                  disabled={isPending}
                />
                <FieldError>{error}</FieldError>
              </Field>
            ) : (
              <Field className="gap-2" data-invalid={!!error}>
                <FieldLabel htmlFor="delete-account-code">
                  Enter the code we sent to {security.email}
                </FieldLabel>
                <OtpInput
                  id="delete-account-code"
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError(null);
                  }}
                  autoFocus
                  invalid={!!error}
                  disabled={isPending}
                />
                <FieldError>{error}</FieldError>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={isPending || secondsLeft > 0}
                  className="justify-self-start text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {secondsLeft > 0
                    ? `Resend code in ${secondsLeft}s`
                    : "Resend code"}
                </button>
              </Field>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {awaitingCode ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Sending..." : "Send code"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending || (!usePassword && code.length !== 6)}
                >
                  {isPending ? "Deleting..." : "Delete account"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
