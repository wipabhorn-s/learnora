// api\src\auth\dto\verify-login-code.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { IsUUID, Matches } from 'class-validator';

/** ใช้ทั้งตอนยืนยันรหัสล็อกอิน และตอนยืนยันการเปิดใช้ 2FA */
export class VerifyLoginCodeDto {
  @IsUUID()
  challengeId: string;

  @Trim()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code' })
  code: string;
}
