// api\src\config\env.validation.ts

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().max(65535).min(0),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
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
