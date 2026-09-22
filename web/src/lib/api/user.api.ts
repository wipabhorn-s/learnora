import { apiFetch } from "@/lib/api/api-fetch";
import { SecurityOverview, UserResponse } from "@/lib/api/api.type";
import {
  ChangeEmailInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from "@/lib/schemas/user.schema";

export const UserApi = {
  updateProfile(data: UpdateProfileInput, token: string) {
    return apiFetch<UserResponse>("/users/me", {
      method: "PATCH",
      body: data,
      token,
    });
  },

  changePassword(data: ChangePasswordInput, token: string) {
    return apiFetch<{ message: string }>("/users/me/password", {
      method: "PATCH",
      body: data,
      token,
    });
  },

  updateAvatar(formData: FormData, token: string) {
    return apiFetch<{ url: string }>("/users/me/avatar", {
      method: "PATCH",
      body: formData,
      token,
    });
  },

  removeAvatar(token: string) {
    return apiFetch<{ message: string }>("/users/me/avatar", {
      method: "DELETE",
      token,
    });
  },

  getSecurity(token: string) {
    return apiFetch<SecurityOverview>("/users/me/security", {
      token,
      cache: "no-store",
    });
  },

  setPassword(newPassword: string, token: string) {
    return apiFetch<{ message: string }>("/users/me/password", {
      method: "POST",
      body: { newPassword },
      token,
    });
  },

  connectGoogle(idToken: string, token: string) {
    return apiFetch<{ message: string }>("/users/me/google", {
      method: "POST",
      body: { idToken },
      token,
    });
  },

  disconnectGoogle(token: string) {
    return apiFetch<{ message: string }>("/users/me/google", {
      method: "DELETE",
      token,
    });
  },

  changeEmail(data: ChangeEmailInput, token: string) {
    return apiFetch<{ message: string; pendingEmail: string }>(
      "/users/me/email-change",
      { method: "POST", body: data, token },
    );
  },

  becomeInstructor(token: string) {
    return apiFetch<{ message: string; access_token: string }>(
      "/users/me/instructor",
      { method: "POST", token },
    );
  },
};
