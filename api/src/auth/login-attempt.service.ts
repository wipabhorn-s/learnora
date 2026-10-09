import { PrismaService } from '@/database/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

/** ใส่รหัสผ่านผิดจากเครื่องเดียว (อีเมล + IP เดียวกัน) ได้กี่ครั้ง ก่อนล็อกเครื่องนั้น */
export const MAX_FAILED_LOGINS = 5;
/**
 * ใส่ผิดรวมทุก IP ได้กี่ครั้ง ก่อนล็อกทั้งบัญชี
 * กันการเดารหัสแบบกระจายหลายเครื่อง ตั้งสูงไว้ คนนอกจะล็อกบัญชีคนอื่นได้ยาก
 */
export const MAX_FAILED_LOGINS_PER_ACCOUNT = 30;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

/**
 * กันเดารหัสผ่าน นับ 2 ชั้นใน 15 นาที:
 * - อีเมล + IP: ผิดครบ MAX_FAILED_LOGINS ครั้ง ล็อกเฉพาะ IP นั้นกับอีเมลนั้น 15 นาที
 *   คนอื่นจึงพิมพ์รหัสผิดใส่อีเมลเราเพื่อล็อกเราไม่ได้ (เราอยู่คนละ IP)
 * - อีเมลอย่างเดียว: ผิดรวมครบ MAX_FAILED_LOGINS_PER_ACCOUNT ครั้งจากทุก IP ล็อกทั้งบัญชี
 *
 * IP คือ IP จริงของผู้ใช้ที่เว็บส่งต่อมา (X-Forwarded-For + TRUST_PROXY ใน main.ts)
 * อีเมลที่ไม่มีในระบบก็นับ คนนอกจะแยกไม่ออกว่าบัญชีไหนมีอยู่จริง
 * เก็บในฐานข้อมูล (hash ของอีเมล/IP) รีสตาร์ทไม่หาย และทุก instance นับร่วมกัน
 */
@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  private keys(email: string, ip: string) {
    const normalized = email.trim().toLowerCase();
    return {
      device: sha256(`device:${normalized}|${ip}`),
      account: sha256(`account:${normalized}`),
    };
  }

  /** ถูกล็อกอยู่ (ชั้นใดชั้นหนึ่ง) = throw 429 พร้อมบอกว่ารออีกกี่นาที */
  async assertNotLocked(email: string, ip: string, now = new Date()) {
    const { device, account } = this.keys(email, ip);
    const rows = await this.prisma.loginAttempt.findMany({
      where: { key: { in: [device, account] }, lockedUntil: { gt: now } },
      select: { lockedUntil: true },
    });
    if (rows.length === 0) return;

    const lockedUntil = Math.max(
      ...rows.map((row) => row.lockedUntil!.getTime()),
    );
    const minutes = Math.ceil((lockedUntil - now.getTime()) / 60_000);
    throw new HttpException(
      {
        message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
        code: 'TOO_MANY_ATTEMPTS',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async recordFailure(email: string, ip: string, now = new Date()) {
    const { device, account } = this.keys(email, ip);
    await Promise.all([
      this.bump(device, MAX_FAILED_LOGINS, now),
      this.bump(account, MAX_FAILED_LOGINS_PER_ACCOUNT, now),
    ]);

    // เก็บกวาดแถวที่หมดอายุแล้ว ตารางจะได้ไม่โตเรื่อย ๆ
    await this.prisma.loginAttempt.deleteMany({
      where: {
        firstAt: { lt: new Date(now.getTime() - WINDOW_MS) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
    });
  }

  /** ล็อกอินสำเร็จ: ล้างประวัติใส่ผิดของอีเมลนี้ (ทั้งเครื่องนี้และรวมทั้งบัญชี) */
  async reset(email: string, ip: string) {
    const { device, account } = this.keys(email, ip);
    await this.prisma.loginAttempt.deleteMany({
      where: { key: { in: [device, account] } },
    });
  }

  /** นับเพิ่มหนึ่งครั้ง ครบ limit ภายในช่วงเวลา = ล็อก */
  private async bump(key: string, limit: number, now: Date) {
    const existing = await this.prisma.loginAttempt.findUnique({
      where: { key },
    });

    // ไม่เคยผิด หรือผิดครั้งแรกนานเกินช่วงเวลาแล้ว (และไม่ได้ล็อกอยู่) เริ่มนับใหม่
    const expired =
      !existing ||
      (now.getTime() - existing.firstAt.getTime() > WINDOW_MS &&
        (!existing.lockedUntil || existing.lockedUntil <= now));
    const count = expired ? 1 : existing.count + 1;
    const lockedUntil =
      count >= limit ? new Date(now.getTime() + LOCK_MS) : null;

    await this.prisma.loginAttempt.upsert({
      where: { key },
      create: { key, count, firstAt: now, lockedUntil },
      update: expired
        ? { count, firstAt: now, lockedUntil }
        : { count, lockedUntil: lockedUntil ?? existing.lockedUntil },
    });
  }
}
