import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddToWishlistDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;
}
