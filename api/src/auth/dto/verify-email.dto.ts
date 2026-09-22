// api\src\auth\dto\verify-email.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  token: string;
}
