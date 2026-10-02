import { Trim } from '@/common/decorator/trim.decorator';
import { IsOptional, IsString } from 'class-validator';

export class FindAdminsDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;
}
