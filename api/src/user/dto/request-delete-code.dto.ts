import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, MaxLength } from 'class-validator';

/** พิมพ์อีเมลของบัญชีตัวเองก่อน กันกดผิด แล้วระบบส่งรหัสไปที่อีเมลนั้น */
export class RequestDeleteCodeDto {
  @Trim()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;
}
