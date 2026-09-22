import { Trim } from '@/common/decorator/trim.decorator';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindUsersDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  // เดิมกรองด้วย role แต่สิทธิ์สอนย้ายมาอยู่ที่ isInstructor แล้ว
  // มาเป็น query string จึงต้องแปลง "true"/"false" เป็น boolean เอง
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  isInstructor?: boolean;

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
