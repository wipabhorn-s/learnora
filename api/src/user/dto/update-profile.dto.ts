import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  /** ไม่ส่งมา = ไม่แก้ ส่งค่าว่าง = ลบ bio */
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(1000)
  bio?: string;
}
