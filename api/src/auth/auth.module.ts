// api\src\auth\auth.module.ts

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '@/user/user.module';
import { AccessTokenService } from './access-token.service';
import { ResetTokenService } from './reset-token.service';
import { GoogleAuthService } from './google-auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenService,
    ResetTokenService,
    GoogleAuthService,
  ],
  imports: [UserModule],
  exports: [AccessTokenService],
})
export class AuthModule {}
