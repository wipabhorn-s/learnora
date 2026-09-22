// api\src\user\dto\change-email.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangeEmailDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @Trim()
  newEmail: string;

  // ยืนยันตัวตนทุกครั้งที่เปลี่ยนอีเมล แม้จะล็อกอินอยู่แล้วก็ตาม
  @IsString()
  @IsNotEmpty()
  password: string;
}
