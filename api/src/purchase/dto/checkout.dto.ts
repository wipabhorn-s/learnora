import { PaymentMethod } from '@/database/generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

/** แอปธนาคารที่ Opn รองรับ (ค่า source.type = mobile_banking_<bank>) */
export const MOBILE_BANKS = ['kbank', 'scb', 'ktb', 'bbl', 'bay'] as const;
export type MobileBank = (typeof MOBILE_BANKS)[number];

export class CheckoutDto {
  /** ไม่ส่งมาได้เฉพาะตะกร้าที่ฟรีทั้งหมด */
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  /** โทเค็นบัตรที่ Omise.js สร้างในเบราว์เซอร์ เลขบัตรไม่ผ่านเซิร์ฟเวอร์เรา */
  @ValidateIf((dto: CheckoutDto) => dto.method === PaymentMethod.CARD)
  @IsString()
  @Matches(/^tokn_\w+$/, { message: 'Invalid card token' })
  cardToken?: string;

  @ValidateIf((dto: CheckoutDto) => dto.method === PaymentMethod.TRUEMONEY)
  @Matches(/^0\d{9}$/, {
    message: 'Enter a 10-digit TrueMoney phone number starting with 0',
  })
  phoneNumber?: string;

  @ValidateIf((dto: CheckoutDto) => dto.method === PaymentMethod.MOBILE_BANKING)
  @IsIn(MOBILE_BANKS)
  bank?: MobileBank;

  /** ผู้ใช้ยืนยันแล้วว่าจะยกเลิกรายการที่รอจ่ายอยู่ (เช่น QR เดิม) แล้วเริ่มใหม่ */
  @IsOptional()
  @IsBoolean()
  replacePending?: boolean;
}
