// api\src\auth\types\jwt-payload.ts

import { Role } from '@/database/generated/prisma/enums';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type ResetTokenPayload = {
  sub: string;
};
