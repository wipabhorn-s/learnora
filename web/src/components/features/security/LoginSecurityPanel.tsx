"use client";

import PasswordChecklist from "@/components/features/auth/PasswordChecklist";
import ChangePasswordForm from "@/components/features/security/ChangePasswordForm";
import DeleteAccountCard from "@/components/features/security/DeleteAccountCard";
import GoogleConnectButton from "@/components/features/security/GoogleConnectButton";
import SessionsCard from "@/components/features/security/SessionsCard";
import TwoFactorCard from "@/components/features/security/TwoFactorCard";
import StatusBadge from "@/components/shared/StatusBadge";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import {
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
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export default function LoginSecurityPanel({
  security,
  canDeleteAccount = false,
}: {
  security: SecurityOverview;
  /** แอดมินลบบัญชีตัวเองไม่ได้ (ต้องให้ Super Admin จัดการ) จึงไม่แสดง */
  canDeleteAccount?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const passwordForm = useForm<SetPasswordFormInput>({
    resolver: zodResolver(setPasswordSchema),
    // ตรวจซ้ำตอนกดส่งเท่านั้น ระหว่างพิมพ์แก้ให้กรอบแดงหายไปก่อน
    reValidateMode: "onSubmit",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const emailForm = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "", password: "" },
  });

  /** ทุกปุ่มในหน้านี้จบเหมือนกันหมด: แจ้งผลเป็น toast แล้วรีเฟรชสถานะจาก server */
  const run = (
    action: () => Promise<{ success: boolean; message: string }>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      toast.result(result);

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
            <StatusBadge size="sm" tone="success">
              Verified
            </StatusBadge>
          ) : (
            <StatusBadge size="sm" tone="danger">
              Not verified
            </StatusBadge>
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
            method="post"
            onSubmit={emailForm.handleSubmit((data) =>
              run(
                () => changeEmailAction(data),
                () => emailForm.reset(),
              ),
            )}
          >
            <FieldGroup className="gap-3">
              <Controller
                control={emailForm.control}
                name="newEmail"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel required htmlFor="newEmail">
                      New email address
                    </FieldLabel>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="Enter your new email"
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
                    <FieldLabel required htmlFor="currentPasswordForEmail">
                      Confirm with your password
                    </FieldLabel>
                    <PasswordInput
                      id="currentPasswordForEmail"
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

              <Button
                type="submit"
                disabled={isPending}
                size="lg"
                className="w-fit"
              >
                {isPending ? "Sending..." : "Send confirmation link"}
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set a password below before changing your email address.
          </p>
        )}
      </Card>

      {/* --- รหัสผ่าน: มีแล้วเปลี่ยนได้ ยังไม่มี (บัญชี Google ล้วน) ตั้งได้ --- */}
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-bold">Password</h2>
          <p className="text-sm text-muted-foreground">
            {security.hasPassword
              ? "Change the password you use to log in with your email."
              : "This account signs in with Google only. Set a password so you can also log in with your email — and so you can disconnect Google later."}
          </p>
        </div>

        {security.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <form
            method="post"
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
                    <FieldLabel required htmlFor="newPassword">
                      New password
                    </FieldLabel>
                    <PasswordInput
                      id="newPassword"
                      placeholder="Create a strong password"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        passwordForm.clearErrors([
                          "newPassword",
                          "confirmPassword",
                        ]);
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <PasswordChecklist value={field.value} />
                  </Field>
                )}
              />

              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel required htmlFor="confirmNewPassword">
                      Confirm password
                    </FieldLabel>
                    <PasswordInput
                      id="confirmNewPassword"
                      placeholder="Repeat your password"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        passwordForm.clearErrors([
                          "newPassword",
                          "confirmPassword",
                        ]);
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                size="lg"
                className="w-fit"
              >
                {isPending ? "Saving..." : "Set password"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </Card>

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
            <StatusBadge
              size="sm"
              tone={security.googleConnected ? "success" : "neutral"}
            >
              {security.googleConnected ? "Connected" : "Not connected"}
            </StatusBadge>
          </div>

          {security.googleConnected ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !canDisconnect}
              onClick={() => run(disconnectGoogleAction)}
            >
              {isPending ? "Working..." : "Disconnect"}
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

      {/* --- ยืนยันตัวตน 2 ขั้นตอน --- */}
      <TwoFactorCard security={security} />

      {/* --- ออกจากระบบทุกเครื่อง --- */}
      <SessionsCard />

      {/* --- ลบบัญชี (สิทธิ์ตาม PDPA) --- */}
      {canDeleteAccount && <DeleteAccountCard security={security} />}
    </div>
  );
}
