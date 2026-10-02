import { Trim } from '@/common/decorator/trim.decorator';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRefundRequestDto {
  /** นักเรียนเห็นข้อความนี้ในหน้าประวัติการซื้อและในอีเมล */
  @IsString()
  @Trim()
  @MinLength(1, { message: 'Tell the student why the request was declined' })
  @MaxLength(1000)
  note: string;
}
