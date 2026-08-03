import { Trim } from '@/common/decorator/trim.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLessonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @Trim()
  title: string;
}
