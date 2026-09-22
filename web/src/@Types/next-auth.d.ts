import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    // สิทธิ์สอนแยกจาก role เพราะผู้ใช้คนเดียวเป็นได้ทั้งผู้เรียนและผู้สอน
    isInstructor: boolean;
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
    role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    isInstructor: boolean;
    avatarUrl: string | null;
    access_token: string;
  }
}
