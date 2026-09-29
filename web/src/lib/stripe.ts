// อ่าน process.env ตรง ๆ ไม่ผ่าน lib/env.ts เพราะไฟล์นี้ถูก import เข้า
// CheckoutForm ซึ่งเป็น "use client" — ตัวแปรที่ไม่มีคำนำหน้า NEXT_PUBLIC_
// จะเป็น undefined ในเบราว์เซอร์ ทำให้ lib/env.ts โยน error ทิ้งทั้งหน้า
// ค่านี้ถูกตรวจแล้วฝั่ง server ใน lib/env.ts ตั้งแต่ตอน build
import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);
