import z from "zod";

/**
 * ตรวจ env ของฝั่งเว็บ ทำหน้าที่เดียวกับ api/src/config/env.validation.ts
 *
 * เหตุผลที่ต้องมี: เดิมแต่ละไฟล์อ่าน process.env เองกระจัดกระจาย พลาดแล้ว
 * อาการต่างกันไปหมด บางตัวระเบิดตอนรัน บางตัวเงียบ ๆ ไปใช้ค่า fallback
 * (API_URL เคยมี ?? "http://localhost:8000" ต่อท้าย ซึ่งอันตรายที่สุด เพราะ
 * ลืมตั้งบน production แล้วจะไม่มีอะไรเตือนเลย แค่ยิง request ไปที่ว่าง ๆ)
 *
 * ไฟล์นี้ใช้ได้เฉพาะโค้ดฝั่ง server (server component, server action, route
 * handler) เท่านั้น — ห้าม import เข้า "use client" เพราะค่าที่ไม่มีคำนำหน้า
 * NEXT_PUBLIC_ จะเป็น undefined ในเบราว์เซอร์ แล้วจะโยน error ทิ้งทั้งหน้า
 */
const envSchema = z.object({
  API_URL: z.url("API_URL ต้องเป็น URL เต็ม เช่น http://localhost:8000"),
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET ว่างไม่ได้ — สร้างด้วย `npx auth secret`"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // สองตัวล่างถูกใช้ในเบราว์เซอร์ แต่ตรวจที่นี่ด้วยเพราะฝั่ง server อ่านได้
  // เหมือนกัน จะได้รู้ตั้งแต่ตอน build แทนที่จะไปพังใส่หน้าผู้ใช้
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

// ต้องเขียน process.env.ชื่อตัวแปร แบบเต็ม ๆ ทีละตัว ห้ามวนลูปหรือใช้
// process.env[key] เพราะ Next.js แทนค่า NEXT_PUBLIC_* ตอน build ด้วยการ
// มองหาข้อความตรง ๆ ในโค้ด ถ้าเขียนแบบไดนามิกจะได้ undefined
const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Env validation failed\n${z.prettifyError(parsed.error)}\n` +
      `ดูรายการที่ต้องมีทั้งหมดได้ที่ web/.env.example`,
  );
}

export const env = parsed.data;
