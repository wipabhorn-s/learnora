// api\src\auth\dto\forgot-password.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  email: string;
}
