/**
 * ล้างข้อมูลกิจกรรมทั้งหมดในฐานข้อมูล เก็บไว้แค่ users, courses, lessons
 * (ใช้ตอน dev อยากเริ่มทดสอบซื้อ/เรียนใหม่ โดยไม่ต้องสร้างผู้ใช้และคอร์สใหม่)
 *
 * รัน:  pnpm db:del
 *
 * ลบ: token/โค้ดยืนยันทั้งหมด, wishlist, ตะกร้า, คำสั่งซื้อ, ความคืบหน้าการเรียน, คำขอคืนเงิน,
 *     การจ่ายเงินผู้สอนและบัญชีรับเงิน
 * id ของตารางที่ลบเริ่มนับ 1 ใหม่ (RESTART IDENTITY)
 * ไม่ใช้ CASCADE: ถ้าวันหน้ามีตารางที่เก็บไว้อ้างถึงตารางพวกนี้ คำสั่งจะ error แทนการลบตารางนั้นเงียบ ๆ
 * กู้คืนไม่ได้ และไม่ยอมรันเมื่อ NODE_ENV=production
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';

const TABLES = [
  'email_verification_tokens',
  'password_reset_tokens',
  'one_time_codes',
  'wishlists',
  'cart_items',
  'purchases',
  'purchase_items',
  'lesson_progress',
  'refund_requests',
  'payouts',
  'payout_accounts',
];

if (process.env.NODE_ENV === 'production') {
  console.error('db:del ใช้ได้แค่ตอน dev (NODE_ENV=production) ยกเลิก');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const tables = TABLES.map((name) => `"${name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY;`);

  const [users, courses, lessons] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.lesson.count(),
  ]);
  console.log(`ลบแล้ว: ${TABLES.join(', ')}`);
  console.log(`เหลือ: users ${users}, courses ${courses}, lessons ${lessons}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
