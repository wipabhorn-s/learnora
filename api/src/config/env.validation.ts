// api\src\config\env.validation.ts

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().max(65535).min(0),
  DATABASE_URL: z.url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  RESET_TOKEN_SECRET: z.string().min(32),
  RESET_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
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
