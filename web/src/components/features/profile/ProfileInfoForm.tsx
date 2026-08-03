"use client";

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
import { updateProfileAction } from "@/lib/actions/user.action";
import {
  UpdateProfileInput,
  updateProfileSchema,
} from "@/lib/schemas/user.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

type ProfileInfoFormProps = {
  firstName: string;
  lastName: string;
  email: string;
};

export default function ProfileInfoForm({
  firstName,
  lastName,
  email,
}: ProfileInfoFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
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
    },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    setSaved(false);

    startTransition(async () => {
      const result = await updateProfileAction(data);

      if (result.success) {
        reset(data);
        setIsEditing(false);
        setSaved(true);
        router.refresh();
      }
    });
  };

  const handleEdit = () => {
    setSaved(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset();
    setSaved(false);
    setIsEditing(false);
  };

  return (
    <Card className="h-full w-full min-w-0 p-6">
      <form className="min-w-0" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <h2 className="font-bold">Personal Information</h2>

          {saved && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="text-emerald-600" />
              <AlertTitle className="text-emerald-700">
                Profile updated
              </AlertTitle>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>First Name</FieldLabel>
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
                  <FieldLabel htmlFor={field.name}>Last Name</FieldLabel>
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

          <Field className="gap-1">
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <Input id="email" type="email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              Your email address cannot be changed.
            </p>
          </Field>

          <Field className="gap-1">
            {!isEditing ? (
              <Button type="button" className="py-5" onClick={handleEdit}>
                Edit
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="py-5"
                  disabled={isPending}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="py-5"
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
