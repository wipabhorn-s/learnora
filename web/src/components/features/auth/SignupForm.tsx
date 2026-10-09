"use client";

import { useAuthRole } from "@/components/features/auth/AuthRole";
import GoogleButton from "@/components/features/auth/GoogleButton";
import PasswordChecklist, {
  PasswordFieldLabel,
} from "@/components/features/auth/PasswordChecklist";
import AgreementCheckbox, {
  AgreementLink,
} from "@/components/shared/AgreementCheckbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { registerAction } from "@/lib/actions/auth.action";
import { SignupInput, signupSchema } from "@/lib/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useEffect, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

export default function SignupForm({
  initialAsInstructor = false,
}: {
  initialAsInstructor?: boolean;
}) {
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    // ตรวจซ้ำเฉพาะตอนกดส่ง ระหว่างพิมพ์แก้ให้ error หายไปก่อน (ดู clearOnEdit)
    reValidateMode: "onSubmit",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      isInstructor: initialAsInstructor,
      acceptTerms: false,
    },
  });

  const [isPending, startTransition] = useTransition();

  /**
   * เริ่มพิมพ์แก้ช่องไหน กรอบแดงกับข้อความของช่องนั้นหายทันที ไม่ต้องรอให้
   * ค่าถูกก่อน ส่วนรหัสผ่านกับยืนยันรหัสผ่านผูกกันอยู่ ("ไม่ตรงกัน" เกิดจาก
   * ช่องไหนก็ได้) จึงล้างพร้อมกันทั้งคู่ไม่ว่าจะแก้ช่องไหนก่อน
   */
  const clearOnEdit = (name: keyof SignupInput) =>
    clearErrors(
      name === "password" || name === "confirmPassword"
        ? ["password", "confirmPassword"]
        : name,
    );

  const onSubmit = (data: SignupInput) => {
    startTransition(async () => {
      const { confirmPassword, ...input } = data;
      // อีเมลซ้ำก็ไปหน้า "เช็กอีเมล" เหมือนสมัครใหม่ (API ไม่บอกว่าอีเมลนี้มีบัญชีแล้ว)
      // ที่กลับมาถึงตรงนี้จึงเหลือแค่ข้อมูลไม่ผ่านการตรวจ
      const result = await registerAction(input);
      if (result) setError("root", { message: result.message });
    });
  };

  // ปุ่ม Google อยู่นอก <form> จึงอ่านค่าจากฟอร์มตรง ๆ ไม่ได้ ต้องติดตามค่าไว้
  // เพื่อส่งเจตนาเดียวกันไปกับทั้งสองทาง (useWatch แทน watch เพราะ memo ได้)
  const asInstructor = useWatch({ control, name: "isInstructor" });

  // ให้ตัวละครฝั่งซ้าย (AuthHero) เปลี่ยนตาม role ที่เลือก ออกจากหน้านี้แล้วกลับเป็นนักเรียน
  const { setRole } = useAuthRole();
  useEffect(() => {
    setRole(asInstructor ? "instructor" : "student");
  }, [asInstructor, setRole]);
  useEffect(() => () => setRole("student"), [setRole]);

  return (
    <div className="grid gap-4">
      {/* เลือกว่าจะเปิดสิทธิ์สอนให้ตั้งแต่แรกไหม — เปลี่ยนทีหลังได้ในหน้า settings */}
      <Controller
        control={control}
        name="isInstructor"
        render={({ field }) => (
          <SegmentedControl
            fullWidth
            options={[
              { value: false, label: "Register as Student" },
              { value: true, label: "Register as Instructor" },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <GoogleButton label="Sign up with Google" asInstructor={asInstructor} />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form method="post" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-3">
          {errors.root && (
            <Alert
              variant="destructive"
              className="border-destructive bg-destructive/15"
            >
              <AlertCircle />
              <AlertTitle>{errors.root.message}</AlertTitle>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    First name
                  </FieldLabel>
                  <Input
                    placeholder="Enter your first name"
                    id={field.name}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      clearOnEdit(field.name);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="lastName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    Last name
                  </FieldLabel>
                  <Input
                    placeholder="Enter your last name"
                    id={field.name}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      clearOnEdit(field.name);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel required htmlFor={field.name}>
                  Email address
                </FieldLabel>
                <Input
                  placeholder="Enter your email"
                  type="email"
                  autoComplete="email"
                  noAutofill
                  id={field.name}
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    clearOnEdit(field.name);
                  }}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* จอกว้าง: รหัสผ่านกับยืนยันรหัสผ่านอยู่แถวเดียวกัน ฟอร์มจะได้พอดีหนึ่งหน้าจอ */}
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <PasswordFieldLabel
                    required
                    htmlFor={field.name}
                    value={field.value}
                  >
                    Password
                  </PasswordFieldLabel>
                  {/* new-password: Chrome ไม่เอารหัสที่บันทึกไว้มาเติม (เสนอรหัสแข็งแรงให้แทน) */}
                  <PasswordInput
                    placeholder="Enter password"
                    autoComplete="new-password"
                    id={field.name}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      clearOnEdit(field.name);
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
              control={control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    Confirm password
                  </FieldLabel>
                  <PasswordInput
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    id={field.name}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      clearOnEdit(field.name);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* สมัครด้วยอีเมลต้องติ๊กยอมรับ (สมัครด้วย Google มีข้อความแจ้งใต้ปุ่มแทน) */}
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field, fieldState }) => (
              <div className="grid gap-1">
                <AgreementCheckbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    clearOnEdit(field.name);
                  }}
                  invalid={fieldState.invalid}
                >
                  I agree to the{" "}
                  <AgreementLink href="/terms">Terms of Service</AgreementLink>{" "}
                  and{" "}
                  <AgreementLink href="/privacy">Privacy Policy</AgreementLink>
                </AgreementCheckbox>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />

          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Creating account..." : "Create Account"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
