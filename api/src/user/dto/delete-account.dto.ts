import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * ยืนยันการลบบัญชี 2 แบบ
 * - บัญชีที่มีรหัสผ่าน: ส่ง password
 * - บัญชีที่ไม่มีรหัสผ่าน (เข้าทาง Google): ขอรหัสทางอีเมลก่อน แล้วส่ง challengeId + code
 */
export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsUUID()
  challengeId?: string;

  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' })
  code?: string;
}
