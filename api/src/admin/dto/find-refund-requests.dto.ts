import { RefundRequestStatus } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindRefundRequestsDto {
  /** ไม่ส่ง = ทุกสถานะ */
  @IsOptional()
  @IsEnum(RefundRequestStatus)
  status?: RefundRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
