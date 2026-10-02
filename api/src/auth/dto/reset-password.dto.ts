// api\src\auth\dto\reset-password.dto.ts

import { StrongPassword } from '@/common/decorator/strong-password.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @StrongPassword()
  newPassword: string;
}
