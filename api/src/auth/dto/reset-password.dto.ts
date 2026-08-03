// api\src\auth\dto\reset-password.dto.ts

import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsAlphanumeric,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @IsAlphanumeric()
  newPassword: string;
}
