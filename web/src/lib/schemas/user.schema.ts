import { passwordSchema } from "@/lib/schemas/password.schema";
import z from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  /** ไม่ส่ง = ไม่แก้ (ช่องนี้แสดงเฉพาะผู้สอน) */
  bio: z.string().max(1000, "Bio must be 1,000 characters or fewer").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const changePasswordFieldsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export const changePasswordSchema = changePasswordFieldsSchema.refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  },
);

export const changePasswordInputSchema = changePasswordFieldsSchema.omit({
  confirmPassword: true,
});

export type ChangePasswordFormInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const setPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SetPasswordFormInput = z.infer<typeof setPasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
