import { apiFetch } from "@/lib/api/api-fetch";
import {
  LoginCodeRequired,
  LoginResponse,
  UserResponse,
} from "@/lib/api/api.type";
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
    return apiFetch<LoginResponse | LoginCodeRequired>("/auth/login", {
      method: "POST",
      body: data,
    });
  },

  verifyLoginCode(challengeId: string, code: string) {
    return apiFetch<LoginResponse>("/auth/login/code", {
      method: "POST",
      body: { challengeId, code },
    });
  },

  resendLoginCode(challengeId: string) {
    return apiFetch<{ challengeId: string; message: string }>(
      "/auth/login/code/resend",
      { method: "POST", body: { challengeId } },
    );
  },

  loginWithGoogle(idToken: string, asInstructor = false) {
    return apiFetch<LoginResponse>("/auth/google", {
      method: "POST",
      body: { idToken, asInstructor },
    });
  },

  verifyEmail(token: string) {
    return apiFetch<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: { token },
    });
  },

  resendVerification(email: string) {
    return apiFetch<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: { email },
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

  /** ข้อมูลล่าสุดจากฐานข้อมูล สำหรับฟิลด์ที่ไม่ได้เก็บใน session (เช่น bio) */
  getProfile(token: string) {
    return apiFetch<UserResponse>("/auth/profile", { token });
  },
};
