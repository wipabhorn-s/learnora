import { Trim } from '@/common/decorator/trim.decorator';
import { Role } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindUsersDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsIn([Role.STUDENT, Role.INSTRUCTOR])
  role?: Role;

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
