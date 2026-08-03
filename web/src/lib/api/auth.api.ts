import { apiFetch } from "@/lib/api/api-fetch";
import { LoginResponse } from "@/lib/api/api.type";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/lib/schemas/auth.schema";

export const AuthApi = {
  register(data: RegisterInput) {
    return apiFetch<{ message: string }>("/auth/register", {
      method: "POST",
      body: data,
    });
  },

  login(data: LoginInput) {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: data,
    });
  },

  loginWithGoogle(idToken: string) {
    return apiFetch<LoginResponse>("/auth/google", {
      method: "POST",
      body: { idToken },
    });
  },

  forgotPassword(data: ForgotPasswordInput) {
    return apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: data,
    });
  },

  resetPassword(data: ResetPasswordInput) {
    return apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: data,
    });
  },
};
