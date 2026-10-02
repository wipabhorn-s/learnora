import { Workspace, WORKSPACE_COOKIE } from "@/lib/constants/workspace";
import { cookies } from "next/headers";

/** พื้นที่ทำงานล่าสุด ค่าเริ่มต้นเป็นฝั่งเรียน เพราะทุกบัญชีเรียนได้ */
export async function getLastWorkspace(): Promise<Workspace> {
  const value = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return value === "teach" ? "teach" : "learn";
}
