"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction } from "@/lib/actions/user.action";
import {
  UpdateProfileInput,
  updateProfileSchema,
} from "@/lib/schemas/user.schema";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

type ProfileInfoFormProps = {
  firstName: string;
  lastName: string;
  email: string;
  /** undefined = ไม่ใช่ผู้สอน ไม่แสดงช่อง bio และไม่ส่งไปแก้ */
  bio?: string;
};

export default function ProfileInfoForm({
  firstName,
  lastName,
  email,
  bio,
}: ProfileInfoFormProps) {
  const showBio = bio !== undefined;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName,
      lastName,
      bio,
    },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    startTransition(async () => {
      const result = await updateProfileAction(data);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      reset(data);
      setIsEditing(false);
      toast.success("Profile updated");
      router.refresh();
    });
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <Card className="w-full min-w-0 p-6">
      <form method="post" className="min-w-0" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <h2 className="font-bold">Personal Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    First Name
                  </FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    disabled={!isEditing || isPending}
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
                    Last Name
                  </FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    disabled={!isEditing || isPending}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {showBio && (
            <Controller
              control={control}
              name="bio"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel optional htmlFor={field.name}>
                    Instructor Bio
                  </FieldLabel>
                  <FieldDescription>
                    Shown on your course pages under About the instructor.
                  </FieldDescription>
                  <Textarea
                    id={field.name}
                    {...field}
                    value={field.value ?? ""}
                    rows={5}
                    maxLength={1000}
                    placeholder="Enter your bio"
                    disabled={!isEditing || isPending}
                    aria-invalid={fieldState.invalid}
                    className="min-h-28 resize-y"
                  />
                  <p className="text-right text-xs text-muted-foreground tabular-nums">
                    {(field.value ?? "").length}/1000
                  </p>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          <Field className="gap-1">
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <Input id="email" type="email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              To change your email, go to Login &amp; Security.
            </p>
          </Field>

          <Field className="gap-1">
            {!isEditing ? (
              <Button type="button" size="lg" onClick={handleEdit}>
                Edit
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isPending}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!isDirty || isPending}
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </Field>
        </FieldGroup>
      </form>
    </Card>
  );
}
