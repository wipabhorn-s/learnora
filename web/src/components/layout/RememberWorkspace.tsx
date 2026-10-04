"use client";

import { Workspace, WORKSPACE_COOKIE } from "@/lib/constants/workspace";
import { useEffect } from "react";

/**
 * จำว่าผู้ใช้อยู่พื้นที่ไหนล่าสุด layout ฝั่ง server ตั้งคุกกี้เองไม่ได้
 * จึงให้คอมโพเนนต์เล็ก ๆ นี้เขียนแทนตอนเปิดหน้าในพื้นที่นั้น ไม่ว่าจะเข้ามา
 * ทางสวิตช์ ลิงก์ หรือพิมพ์ URL เอง ค่านี้ไม่ใช่ข้อมูลลับ ไม่ต้อง httpOnly
 */
export default function RememberWorkspace({
  workspace,
}: {
  workspace: Workspace;
}) {
  useEffect(() => {
    document.cookie = `${WORKSPACE_COOKIE}=${workspace}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [workspace]);

  return null;
}
