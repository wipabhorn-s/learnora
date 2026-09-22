// api\src\config\env.validation.ts

import { Logger } from '@nestjs/common';
import z from 'zod';

// ไม่ใส่ = ปล่อยเป็น undefined แทนที่จะเป็นสตริงว่าง เพื่อให้ ?? ทำงานถูก
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  PORT: z.coerce.number().int().max(65535).min(0),
  DATABASE_URL: z.url(),
  // ฐานของลิงก์ที่ส่งไปในอีเมล (ยืนยันอีเมล / ตั้งรหัสผ่านใหม่)
  FRONTEND_URL: z.url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  RESET_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  // ส่งเมลผ่าน HTTP API ของ Brevo ไม่ใช่ SMTP เพราะผู้ให้บริการโฮสต์
  // ส่วนใหญ่ปิด outbound SMTP (port 25/465/587) ไว้ (ดู MailService)
  // optional แบบเดียวกับคีย์อื่น ๆ: ไม่ใส่ก็ boot ขึ้น แต่ถ้ามีการส่งเมลจริง
  // จะได้ 503 พร้อมบอกว่าขาด env ตัวไหน แทนที่จะเงียบไปเฉย ๆ
  BREVO_API_KEY: optionalString,
  MAIL_FROM: z.string().min(1),
  // ชื่อผู้ส่งที่ผู้รับเห็น — ไม่ใส่จะดึงจากส่วนหน้าของ MAIL_FROM
  MAIL_FROM_NAME: optionalString,
});

export function validate(config: Record<string, any>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const logger = new Logger('EnvValidation');
    logger.error('Env validation failed', z.prettifyError(parsed.error));
    throw new Error('Env validation failed');
  }
  return parsed.data;
}

export type EnvVariable = z.infer<typeof envSchema>;
