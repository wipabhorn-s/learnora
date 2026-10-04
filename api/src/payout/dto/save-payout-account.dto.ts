import { Trim } from '@/common/decorator/trim.decorator';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** บัญชีธนาคารที่ผู้สอนใช้รับเงิน */
export class SavePayoutAccountDto {
  @IsString()
  @Trim()
  @MinLength(1, { message: 'Enter your bank name' })
  @MaxLength(100)
  bankName: string;

  @IsString()
  @Trim()
  @MinLength(1, { message: 'Enter the account holder name' })
  @MaxLength(100)
  accountName: string;

  /** ตัวเลขล้วน (ตัดขีด/ช่องว่างฝั่ง web ก่อนส่ง) */
  @IsString()
  @Trim()
  @Matches(/^\d{6,20}$/, {
    message: 'Account number must be 6-20 digits',
  })
  accountNumber: string;
}
