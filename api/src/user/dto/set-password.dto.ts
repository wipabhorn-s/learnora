// api\src\user\dto\set-password.dto.ts

import {
  IsAlphanumeric,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @IsAlphanumeric()
  newPassword: string;
}
