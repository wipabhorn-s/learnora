export type UserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  isInstructor: boolean;
  avatarUrl: string | null;
  bio: string | null;
  status: boolean;
};

export type LoginResponse = {
  /** อายุสั้น (ประมาณ 15 นาที) proxy.ts ต่ออายุให้เองด้วย refresh_token */
  access_token: string;
  refresh_token: string;
  user: UserResponse;
};

/** รหัสผ่านถูก แต่เปิด 2FA ไว้ ต้องใส่รหัส 6 หลักจากอีเมลก่อนถึงได้ token */
export type LoginCodeRequired = {
  codeRequired: true;
  challengeId: string;
};

/** ภาพรวมวิธีเข้าสู่ระบบของบัญชี สำหรับหน้า Login & security */
export type SecurityOverview = {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  googleConnected: boolean;
  isInstructor: boolean;
  twoFactorEnabled: boolean;
  /** อีเมลใหม่ที่รอเจ้าของกดยืนยัน — null ถ้าไม่มีคำขอค้างอยู่ */
  pendingEmail: string | null;
};
