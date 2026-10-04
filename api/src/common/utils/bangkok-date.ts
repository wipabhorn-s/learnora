import { Prisma } from '@/database/generated/prisma/client';

/**
 * ตัวช่วยเรื่องวันที่ตามเวลาไทย เซิร์ฟเวอร์รันเป็น UTC ถ้านับวันตาม UTC
 * รายการตอนตี 1 ของไทยจะไปตกวันก่อนหน้า ตัวเลขรายวัน/รายเดือนจะเพี้ยน
 * วันที่ทั้งหมดในไฟล์นี้เป็นสตริง YYYY-MM-DD ของปฏิทินไทย
 */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** วันที่ตามปฏิทินไทยของเวลาที่ให้มา */
export function bangkokDateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** เที่ยงคืนเวลาไทยของวันนั้น (เป็น Date ที่ใช้เทียบใน query ได้เลย) */
export function startOfBangkokDay(key: string): Date {
  return new Date(`${key}T00:00:00+07:00`);
}

/** เลื่อนวันแบบปฏิทิน ข้ามเดือน/ปีให้เอง */
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ช่วง from–to (รวมทั้งวันของ to) เป็นเงื่อนไข DateTime ของ Prisma */
export function bangkokDateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;

  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = startOfBangkokDay(from);
  if (to) range.lt = startOfBangkokDay(addDays(to, 1));
  return range;
}
