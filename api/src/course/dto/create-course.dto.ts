import { Trim } from '@/common/decorator/trim.decorator';
import { AccessType, Category, Level } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { StringList } from '@/common/decorator/string-list.decorator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  title: string;

  /** ส่งค่าว่างมา = ลบ subtitle */
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(160)
  subtitle?: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  description: string;

  @StringList({ maxItems: 10, maxLength: 160 })
  learningOutcomes?: string[];

  @StringList({ maxItems: 10, maxLength: 160 })
  requirements?: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(Category)
  category: Category;

  @IsEnum(Level)
  level: Level;

  @IsEnum(AccessType)
  accessType: AccessType;

  @ValidateIf((o: CreateCourseDto) => o.accessType === AccessType.LIMITED)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accessDuration?: number;
}
