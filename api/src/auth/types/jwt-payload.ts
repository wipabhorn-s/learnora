// api\src\auth\types\jwt-payload.ts

import { Role } from '@/database/generated/prisma/enums';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  // สิทธิ์สอนแยกจาก role เพราะผู้ใช้คนเดียวเป็นได้ทั้งผู้เรียนและผู้สอน
  isInstructor: boolean;
};
