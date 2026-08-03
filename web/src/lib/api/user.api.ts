import { apiFetch } from "@/lib/api/api-fetch";
import { UserResponse } from "@/lib/api/api.type";
import {
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
};
