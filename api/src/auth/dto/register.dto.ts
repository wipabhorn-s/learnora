// api\src\auth\dto\register.dto.ts

import { StrongPassword } from '@/common/decorator/strong-password.decorator';
import { Trim } from '@/common/decorator/trim.decorator';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @Trim()
  email: string;

  @StrongPassword()
  password: string;

  /**
   * แทน role เดิม — ทุกคนสมัครมาเป็นผู้ใช้ทั่วไปที่ซื้อและเรียนคอร์สได้
   * ค่านี้บอกแค่ว่าเปิดสิทธิ์สอนให้ตั้งแต่แรกด้วยหรือไม่ และเปลี่ยนทีหลัง
   * ได้จากหน้า settings
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isInstructor?: boolean;

  /** ติ๊กยอมรับ Terms of Service และ Privacy Policy ในหน้าสมัครแล้ว */
  @Equals(true, {
    message: 'Please accept the Terms of Service and Privacy Policy',
  })
  acceptTerms: boolean;
}
