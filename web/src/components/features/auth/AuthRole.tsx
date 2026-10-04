"use client";

import { createContext, useContext, useState } from "react";

export type AuthRole = "student" | "instructor";

type AuthRoleState = { role: AuthRole; setRole: (role: AuthRole) => void };

const AuthRoleContext = createContext<AuthRoleState>({
  role: "student",
  setRole: () => {},
});

/**
 * role ที่เลือกในฟอร์มสมัคร (SignupForm) ส่งไปให้ภาพตัวละครฝั่งซ้าย (AuthHero)
 * สองส่วนนี้อยู่คนละที่ (ฟอร์มอยู่ใน page, ภาพอยู่ใน layout) จึงต้องใช้ context ร่วมกัน
 * หน้าอื่น ๆ ใน (auth) ไม่ได้ตั้งค่า จะเห็นภาพนักเรียนเป็นค่าเริ่มต้น
 */
export function AuthRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AuthRole>("student");
  return (
    <AuthRoleContext value={{ role, setRole }}>{children}</AuthRoleContext>
  );
}

export const useAuthRole = () => useContext(AuthRoleContext);
