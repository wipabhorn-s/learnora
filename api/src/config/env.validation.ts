// api\src\config\env.validation.ts

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().max(65535).min(0),
  /**
   * ใครส่ง X-Forwarded-For มาแล้วเชื่อได้ (ค่าแบบ Express "trust proxy")
   * API ถูกเรียกจาก server ของเว็บเท่านั้น IP จริงของผู้ใช้จึงมากับ header นี้
   * ต้องเชื่อเฉพาะ server ของเว็บ ไม่งั้นใครก็ปลอม IP หลบ rate limit ได้
   * dev (เว็บกับ API เครื่องเดียวกัน) = loopback, production ใส่ IP/subnet ของ server เว็บ
   */
  TRUST_PROXY: z.string().trim().default('loopback'),
  /**
   * รหัสลับร่วมระหว่าง server เว็บกับ API (ตั้งค่าเดียวกันทั้งสองฝั่ง)
   * มีรหัสนี้ API จึงเชื่อ IP ของผู้ใช้ที่เว็บส่งมา (X-Client-IP) ดู common/utils/client-ip.ts
   * ไม่ตั้ง (dev) = ใช้ IP ที่ต่อเข้ามา + TRUST_PROXY แทน
   */
  INTERNAL_API_SECRET: z
    .string()
    .trim()
    .min(32)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  /** อายุ refresh token (วินาที) ไม่ใส่ = 30 วัน */
  REFRESH_TOKEN_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  MAIL_FROM: z.string().trim().min(1),
  MAIL_FROM_NAME: z.string().trim().min(1),
  BREVO_API_KEY: z.string().trim().min(1),
  RESET_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  OMISE_SECRET_KEY: z.string().trim().min(1),
  /** ส่วนแบ่งรายได้ของผู้สอนจากราคาคอร์ส (%) ที่เหลือเป็นของแพลตฟอร์ม */
  INSTRUCTOR_REVENUE_SHARE_PERCENT: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(70),
  /**
   * กุญแจเข้ารหัสเลขบัญชีธนาคารของผู้สอน: 32 ไบต์ แบบ base64
   * สร้าง: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   * ห้ามเปลี่ยน/ทำหาย หลังมีข้อมูลแล้ว ไม่งั้นอ่านเลขบัญชีเดิมไม่ออก
   */
  PAYOUT_ENCRYPTION_KEY: z
    .string()
    .trim()
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'Must be 32 random bytes, base64-encoded',
    }),
  OMISE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
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
