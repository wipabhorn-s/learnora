"use client";

import GoogleConnectButton from "@/components/features/security/GoogleConnectButton";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  becomeInstructorAction,
  changeEmailAction,
  connectGoogleAction,
  disconnectGoogleAction,
  setPasswordAction,
} from "@/lib/actions/security.action";
import { SecurityOverview } from "@/lib/api/api.type";
import {
  ChangeEmailInput,
  changeEmailSchema,
  SetPasswordFormInput,
  setPasswordSchema,
} from "@/lib/schemas/user.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

type Notice = { kind: "ok" | "error"; message: string } | null;

export default function LoginSecurityPanel({
  security,
}: {
  security: SecurityOverview;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const passwordForm = useForm<SetPasswordFormInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const emailForm = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "", password: "" },
  });

  /** ทุกปุ่มในหน้านี้จบเหมือนกันหมด: ขึ้นข้อความแล้วรีเฟรชสถานะจาก server */
  const run = (
    action: () => Promise<{ success: boolean; message: string }>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      setNotice({
        kind: result.success ? "ok" : "error",
        message: result.message,
      });

      if (result.success) {
        onSuccess?.();
        router.refresh();
      }
    });
  };

  // ยกเลิก Google ได้ต่อเมื่อยังเหลือทางเข้าอีกทาง — เช็กซ้ำฝั่ง API ด้วย
  const canDisconnect = security.googleConnected && security.hasPassword;

  return (
    <div className="grid gap-4">
      {notice && (
        <Alert
          variant={notice.kind === "error" ? "destructive" : undefined}
          className={
            notice.kind === "error"
              ? "border-destructive bg-destructive/15"
              : "border-primary/30 bg-secondary"
          }
        >
          {notice.kind === "error" ? <AlertCircle /> : <CheckCircle2 />}
          <AlertTitle>{notice.message}</AlertTitle>
        </Alert>
      )}

      {/* --- อีเมล --- */}
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-bold">Email address</h2>
          <p className="text-sm text-muted-foreground">
            Used to log in and to receive account notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{security.email}</span>
          {security.emailVerified ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
              Verified
            </span>
          ) : (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              Not verified
            </span>
          )}
        </div>

        {security.pendingEmail && (
          <Alert className="border-primary/30 bg-secondary">
            <MailCheck />
            <AlertTitle>
              Waiting for confirmation at {security.pendingEmail}
            </AlertTitle>
          </Alert>
        )}

        <Separator />

        {security.hasPassword ? (
          <form
            onSubmit={emailForm.handleSubmit((data) =>
              run(() => changeEmailAction(data), () => emailForm.reset()),
            )}
          >
            <FieldGroup className="gap-3">
              <Controller
                control={emailForm.control}
                name="newEmail"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="newEmail">New email address</FieldLabel>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={emailForm.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="currentPasswordForEmail">
                      Confirm with your password
                    </FieldLabel>
                    <Input
                      id="currentPasswordForEmail"
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <p className="text-sm text-muted-foreground">
                We will send a confirmation link to the new address. Your
                current email keeps working until you click it.
              </p>

              <Button type="submit" disabled={isPending} className="w-fit">
                {isPending ? "Sending ..." : "Send confirmation link"}
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set a password below before changing your email address.
          </p>
        )}
      </Card>

      {/* --- รหัสผ่าน (เฉพาะบัญชีที่ยังไม่มี) --- */}
      {!security.hasPassword && (
        <Card className="gap-4 p-6">
          <div>
            <h2 className="font-bold">Password</h2>
            <p className="text-sm text-muted-foreground">
              This account signs in with Google only. Set a password so you can
              also log in with your email — and so you can disconnect Google
              later.
            </p>
          </div>

          <form
            onSubmit={passwordForm.handleSubmit((data) =>
              run(
                () => setPasswordAction(data.newPassword),
                () => passwordForm.reset(),
              ),
            )}
          >
            <FieldGroup className="gap-3">
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="At least 8 characters"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmNewPassword">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="Repeat your password"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button type="submit" disabled={isPending} className="w-fit">
                {isPending ? "Saving ..." : "Set password"}
              </Button>
            </FieldGroup>
          </form>
        </Card>
      )}

      {/* --- Google --- */}
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-bold">Connected accounts</h2>
          <p className="text-sm text-muted-foreground">
            Connect Google to sign in with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Google</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                security.googleConnected
                  ? "bg-secondary text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {security.googleConnected ? "Connected" : "Not connected"}
            </span>
          </div>

          {security.googleConnected ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !canDisconnect}
              onClick={() => run(disconnectGoogleAction)}
            >
              {isPending ? "Working ..." : "Disconnect"}
            </Button>
          ) : (
            <GoogleConnectButton
              disabled={isPending}
              onToken={(idToken) => run(() => connectGoogleAction(idToken))}
            />
          )}
        </div>

        {security.googleConnected && !canDisconnect && (
          <p className="text-sm text-muted-foreground">
            Set a password first — otherwise disconnecting Google would leave
            you with no way to log in.
          </p>
        )}
      </Card>

      {/* --- สิทธิ์สอน --- */}
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-bold">Teaching</h2>
          <p className="text-sm text-muted-foreground">
            {security.isInstructor
              ? "Your account can publish and manage courses."
              : "Turn your account into an instructor account. You keep everything you have already bought."}
          </p>
        </div>

        {security.isInstructor ? (
          <span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
            Instructor enabled
          </span>
        ) : (
          <Button
            type="button"
            className="w-fit"
            disabled={isPending}
            onClick={() => run(becomeInstructorAction)}
          >
            {isPending ? "Working ..." : "Become an instructor"}
          </Button>
        )}
      </Card>
    </div>
  );
}
