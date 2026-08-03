import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindEnrolledCoursesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activePage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiredPage?: number;
}
