// api\src\auth\dto\resend-verification.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @Trim()
  email: string;
}
