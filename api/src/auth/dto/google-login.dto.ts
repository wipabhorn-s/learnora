// api\src\auth\dto\google-login.dto.ts

import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  /**
   * ผู้ใช้กด "Register as Instructor" ก่อนเลือกเข้าด้วย Google
   * มีผลเฉพาะตอนสร้างบัญชีใหม่เท่านั้น ส่งค่านี้มากับบัญชีที่มีอยู่แล้ว
   * จะไม่เปลี่ยนสิทธิ์ให้ ไม่งั้นใครส่ง true มาก็เลื่อนขั้นตัวเองได้
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  asInstructor?: boolean;
}
