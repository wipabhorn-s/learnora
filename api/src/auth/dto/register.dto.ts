// api\src\auth\dto\register.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { Role } from '@/database/generated/prisma/enums';
import {
  IsAlphanumeric,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @Trim()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @IsAlphanumeric()
  password: string;

  @IsNotEmpty()
  @IsString()
  @IsIn([Role.STUDENT, Role.INSTRUCTOR])
  role: Role;
}
