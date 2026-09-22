// api\src\auth\auth.module.ts

import { GoogleAuthModule } from '@/auth/google-auth.module';
import { UserModule } from '@/user/user.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from './token.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [UserModule, GoogleAuthModule, TokenModule],
  // re-export เพื่อให้ AuthGuard ที่ผูกเป็น APP_GUARD ใน AppModule ใช้ได้
  exports: [TokenModule],
})
export class AuthModule {}
