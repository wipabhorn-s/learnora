import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class MoveLessonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderNo: number;
}
