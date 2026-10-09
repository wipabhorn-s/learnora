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
    /** ใช้แค่ตอนล็อกอิน/เปลี่ยนรหัสผ่าน เก็บลง JWT ฝั่ง server ไม่ส่งออกไปกับ session */
    refresh_token?: string;
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
    /** อยู่ในคุกกี้ที่เข้ารหัสไว้เท่านั้น session callback ไม่ส่งออกไปให้ browser */
    refresh_token?: string;
    /** เวลาหมดอายุของ access_token (ms) proxy.ts ใช้ตัดสินว่าต้องต่ออายุหรือยัง */
    accessTokenExpires?: number;
  }
}
