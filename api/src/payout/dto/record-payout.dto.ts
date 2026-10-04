import { Trim } from '@/common/decorator/trim.decorator';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** แอดมินโอนเงินให้ผู้สอนแล้ว บันทึกยอดกับเลขอ้างอิงการโอน */
export class RecordPayoutDto {
  @IsUUID()
  instructorId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be more than 0' })
  amount: number;

  @IsString()
  @Trim()
  @MinLength(1, { message: 'Enter the transfer reference' })
  @MaxLength(100)
  reference: string;
}
