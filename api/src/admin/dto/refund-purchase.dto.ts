import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RefundPurchaseDto {
  /**
   * แอดมินโอนเงินคืนลูกค้าเองแล้ว (ช่องทางที่คืนผ่าน Opn ไม่ได้ เช่นพร้อมเพย์)
   * ระบบจะแค่บันทึกว่าคืนแล้ว ไม่เรียก Opn
   */
  @IsOptional()
  @IsBoolean()
  manual?: boolean;

  /** เลขอ้างอิงการโอนคืน บังคับกรอกเมื่อคืนเงินเอง ไว้ตรวจสอบย้อนหลัง */
  @ValidateIf((dto: RefundPurchaseDto) => dto.manual === true)
  @IsString()
  @Trim()
  @MinLength(1, { message: 'Enter the transfer reference' })
  @MaxLength(100)
  reference?: string;
}
