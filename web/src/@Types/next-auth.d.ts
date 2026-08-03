import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
    avatarUrl: string | null;
    access_token: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
    avatarUrl: string | null;
    access_token: string;
  }
}
