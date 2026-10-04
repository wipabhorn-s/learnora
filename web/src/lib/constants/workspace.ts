/**
 * ผู้ใช้คนเดียวเป็นได้ทั้งผู้เรียนและผู้สอน จึงมีสองพื้นที่ทำงานที่สลับไปมาได้
 * จำพื้นที่ล่าสุดไว้ในคุกกี้ ให้หน้าที่ใช้ร่วมกัน (เช่น /profile) และลิงก์
 * "Dashboard" พากลับไปที่เดิมที่ผู้ใช้ทำงานอยู่
 */
export type Workspace = "learn" | "teach";

export const WORKSPACE_COOKIE = "learnora.workspace";

export const WORKSPACE_HOME: Record<Workspace, string> = {
  learn: "/dashboard",
  teach: "/instructor/dashboard",
};
