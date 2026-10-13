import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const MB = 1024 * 1024;

/**
 * ตรวจชนิดไฟล์ก่อนรับเข้าหน่วยความจำ ไม่ผ่าน = ตอบ 400 พร้อมข้อความ
 * (คืน false เฉย ๆ multer จะทิ้งไฟล์เงียบ ๆ แล้วผู้ใช้เห็นแค่ "file is required")
 */
const acceptMime =
  (allowed: RegExp, message: string): MulterOptions['fileFilter'] =>
  (_req, file, callback) => {
    if (allowed.test(file.mimetype)) callback(null, true);
    else callback(new BadRequestException(message), false);
  };

/**
 * รูปโปรไฟล์ / รูปปกคอร์ส: ไม่เกิน 15 MB (ตรงกับหน้าเว็บ ซึ่งครอปเป็น JPEG ก่อนส่งอยู่แล้ว)
 * ไม่รับ SVG: เป็นไฟล์ที่ฝังสคริปต์ได้
 * เกินขนาด multer ตอบ 413 เอง ไฟล์ทั้งก้อนจึงไม่ถูกอ่านเข้าหน่วยความจำ
 */
export const IMAGE_UPLOAD: MulterOptions = {
  limits: { fileSize: 15 * MB, files: 1 },
  fileFilter: acceptMime(
    /^image\/(jpeg|png|webp|gif)$/,
    'Image must be a JPG, PNG, WebP or GIF file',
  ),
};

/** รูปที่ Cloudinary รับ (กันซ้ำอีกชั้น เผื่อ mimetype ที่ส่งมาไม่ตรงกับไฟล์จริง) */
export const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * วิดีโอบทเรียน: ไม่เกิน 100 MB (ตรงกับหน้าเว็บ)
 * เบราว์เซอร์อัปโหลดตรงไป Cloudinary (ไม่ผ่าน API) API ตรวจขนาดจริงตอนบันทึกบทเรียน
 */
export const VIDEO_MAX_BYTES = 100 * MB;
