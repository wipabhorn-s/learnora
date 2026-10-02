import { Trim } from '@/common/decorator/trim.decorator';
import { AccessType, Category, Level } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** ลำดับผลลัพธ์ในหน้าคอร์ส ค่าเริ่มต้น newest */
export const COURSE_SORTS = ['newest', 'price-asc', 'price-desc'] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

export class FindCoursesDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsEnum(AccessType)
  accessType?: AccessType;

  @IsOptional()
  @IsIn(COURSE_SORTS)
  sort?: CourseSort;

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
