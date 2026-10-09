// api\src\auth\types\jwt-payload.ts

import { Role } from '@/database/generated/prisma/enums';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  // สิทธิ์สอนแยกจาก role เพราะผู้ใช้คนเดียวเป็นได้ทั้งผู้เรียนและผู้สอน
  isInstructor: boolean;
  /**
   * User.sessionVersion ตอนออก token ไม่ตรงกับค่าปัจจุบัน = ถูกยกเลิกแล้ว
   * (token เก่าก่อนมีระบบนี้ไม่มีค่า ถือเป็น 0)
   */
  ver?: number;
};
