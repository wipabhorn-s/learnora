// api\src\user\types\user.type.ts

import { Role } from '@/database/generated/prisma/enums';

export type UserCreateInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
};
