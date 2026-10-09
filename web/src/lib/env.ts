import z from "zod";

const envSchema = z.object({
  API_URL: z.url(),
  AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: z.string().trim().min(1),
  /**
   * รหัสลับร่วมกับ API (ค่าเดียวกับ INTERNAL_API_SECRET ของ API) API จะเชื่อ IP ผู้ใช้ที่ส่งไป
   * ไม่ตั้ง (dev) = ส่ง IP ผ่าน X-Forwarded-For แทน (API เชื่อเพราะอยู่เครื่องเดียวกัน)
   */
  INTERNAL_API_SECRET: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
});

if (!parsed.success) {
  throw new Error(`Env validation failed\n${z.prettifyError(parsed.error)}\n`);
}

export const env = parsed.data;
