// api\src\auth\token.module.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { EmailVerificationTokenService } from '@/auth/email-verification-token.service';
import { OneTimeCodeService } from '@/auth/one-time-code.service';
import { RefreshTokenService } from '@/auth/refresh-token.service';
import { ResetTokenService } from '@/auth/reset-token.service';
import { Module } from '@nestjs/common';

/**
 * แยกออกมาเหมือน GoogleAuthModule — UserModule ต้องออกลิงก์ยืนยันอีเมล
 * ตอนขอเปลี่ยนอีเมล จึงใช้ EmailVerificationTokenService ร่วมกับ AuthModule
 */
@Module({
  providers: [
    AccessTokenService,
    EmailVerificationTokenService,
    ResetTokenService,
    OneTimeCodeService,
    RefreshTokenService,
  ],
  exports: [
    AccessTokenService,
    EmailVerificationTokenService,
    ResetTokenService,
    OneTimeCodeService,
    RefreshTokenService,
  ],
})
export class TokenModule {}
