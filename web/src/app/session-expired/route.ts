import { signOut } from "@/lib/auth";

/**
 * apiFetch พามาที่นี่เมื่อ API ตอบ 401 ทั้งที่ส่ง token ไป
 * server component แก้คุกกี้เองไม่ได้ จึงต้องมาล้าง session ใน route handler
 */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
