export type UserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  isInstructor: boolean;
  avatarUrl: string | null;
  status: boolean;
};

export type LoginResponse = {
  access_token: string;
  user: UserResponse;
};

/** ภาพรวมวิธีเข้าสู่ระบบของบัญชี สำหรับหน้า Login & security */
export type SecurityOverview = {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  googleConnected: boolean;
  isInstructor: boolean;
  /** อีเมลใหม่ที่รอเจ้าของกดยืนยัน — null ถ้าไม่มีคำขอค้างอยู่ */
  pendingEmail: string | null;
};
