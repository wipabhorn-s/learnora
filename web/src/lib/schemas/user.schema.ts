import z from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const changePasswordFieldsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .regex(
      /^[0-9a-zA-Z]{8,}$/,
      "Password must be at least 8 characters and contain only letters and numbers",
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export const changePasswordSchema = changePasswordFieldsSchema
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordInputSchema = changePasswordFieldsSchema.omit({
  confirmPassword: true,
});

export type ChangePasswordFormInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
