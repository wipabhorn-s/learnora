import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Trim()
  title?: string;

  /** เปลี่ยนวิดีโอ: public_id ของไฟล์ใหม่ที่อัปโหลดตรงไป Cloudinary แล้ว */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  videoPublicId?: string;
}
