// api\src\user\user.module.ts

import { GoogleAuthModule } from '@/auth/google-auth.module';
import { TokenModule } from '@/auth/token.module';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [GoogleAuthModule, TokenModule],
  exports: [UserService],
})
export class UserModule {}
