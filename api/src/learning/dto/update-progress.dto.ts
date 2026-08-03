import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastPositionSeconds: number;
}
