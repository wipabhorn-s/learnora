export type UserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl: string | null;
  status: boolean;
};

export type LoginResponse = {
  access_token: string;
  user: UserResponse;
};
