import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * รายการข้อความสั้น ๆ (เช่น What you'll learn) ที่มาจากฟอร์ม multipart
 * multipart ส่ง array ตรง ๆ ไม่ได้ เว็บจึงส่งเป็น JSON string มา
 * แปลงกลับเป็น array แล้ว trim และทิ้งข้อที่ว่าง
 */
export function StringList(options: { maxItems: number; maxLength: number }) {
  return applyDecorators(
    IsOptional(),
    Transform(({ value }: { value: unknown }) => {
      let list: unknown = value;
      if (typeof value === 'string') {
        try {
          list = JSON.parse(value);
        } catch {
          return value; // ปล่อยให้ IsArray ฟ้อง
        }
      }
      if (!Array.isArray(list)) return list;
      return (list as unknown[])
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item) => item !== '');
    }),
    IsArray(),
    ArrayMaxSize(options.maxItems),
    IsString({ each: true }),
    MaxLength(options.maxLength, { each: true }),
  );
}
