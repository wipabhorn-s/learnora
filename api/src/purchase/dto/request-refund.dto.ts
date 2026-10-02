import { Trim } from '@/common/decorator/trim.decorator';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestRefundDto {
  /** ให้แอดมินมีข้อมูลพอพิจารณา จึงบังคับอย่างน้อย 10 ตัวอักษร */
  @IsString()
  @Trim()
  @MinLength(10, {
    message: 'Please tell us a bit more (at least 10 characters)',
  })
  @MaxLength(1000)
  reason: string;
}
