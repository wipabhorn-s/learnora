import { Trim } from '@/common/decorator/trim.decorator';
import { AccessType, Category, Level } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  title: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  description: string;

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
