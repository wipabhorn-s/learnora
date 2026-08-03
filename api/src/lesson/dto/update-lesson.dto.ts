import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Trim()
  title?: string;
}
