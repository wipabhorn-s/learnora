// api\src\auth\dto\register.dto.ts

import { Trim } from '@/common/decorator/trim.decorator';
import { Type } from 'class-transformer';
import {
  IsAlphanumeric,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
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

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @IsAlphanumeric()
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
}
