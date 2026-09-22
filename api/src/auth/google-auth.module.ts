// api\src\auth\google-auth.module.ts

import { GoogleAuthService } from '@/auth/google-auth.service';
import { Module } from '@nestjs/common';

/**
 * แยกออกมาเป็นโมดูลของตัวเองเพราะทั้ง AuthModule (ล็อกอินด้วย Google) และ
 * UserModule (เชื่อม/ยกเลิก Google จากหน้า settings) ต้องใช้ตัวเดียวกัน
 * ถ้าให้ UserModule ไป import AuthModule จะกลายเป็น circular dependency
 */
@Module({
  providers: [GoogleAuthService],
  exports: [GoogleAuthService],
})
export class GoogleAuthModule {}
