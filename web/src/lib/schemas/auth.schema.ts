import z from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .regex(
      /^[0-9a-zA-Z]{8,}$/,
      "Password must be at least 8 characters and contain only letters and numbers",
    ),
  role: z.enum(["STUDENT", "INSTRUCTOR"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .regex(
      /^[0-9a-zA-Z]{8,}$/,
      "Password must be at least 8 characters and contain only letters and numbers",
    ),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const signupSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
