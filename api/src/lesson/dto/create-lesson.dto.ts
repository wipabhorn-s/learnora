import { Trim } from '@/common/decorator/trim.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateLessonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @Trim()
  title: string;

  /**
   * public_id ของวิดีโอที่เบราว์เซอร์อัปโหลดตรงไป Cloudinary แล้ว
   * (ขอใบอนุญาตอัปโหลดที่ POST /lessons/video-upload ก่อน)
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  videoPublicId: string;
}
