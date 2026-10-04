import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/** ใส่รหัสผ่านผิดได้กี่ครั้งภายในช่วงเวลา ก่อนล็อกอีเมลนั้นชั่วคราว */
export const MAX_FAILED_LOGINS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

type Attempts = { count: number; firstAt: number; lockedUntil: number };

/**
 * กันเดารหัสผ่าน: ผิดครบ MAX_FAILED_LOGINS ครั้งใน 15 นาที อีเมลนั้นล็อก 15 นาที
 *
 * นับตามอีเมล ไม่ใช่ IP เพราะเว็บเรียก API จากเซิร์ฟเวอร์ Next.js
 * ทุกคำขอจึงมาจาก IP เดียวกัน ถ้านับตาม IP ผู้ใช้ทุกคนจะโดนล็อกพร้อมกัน
 * อีเมลที่ไม่มีในระบบก็นับ คนนอกจะแยกไม่ออกว่าบัญชีไหนมีอยู่จริง
 *
 * เก็บในหน่วยความจำ: รีสตาร์ทแล้วเริ่มนับใหม่ และถ้ารันหลาย instance
 * แต่ละตัวนับแยกกัน (ยังจำกัดได้ แค่หลวมขึ้นตามจำนวน instance)
 * ถ้าขยายเป็นหลาย instance ควรย้ายไปเก็บใน Redis
 */
@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, Attempts>();

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  /** ถูกล็อกอยู่ = throw 429 พร้อมบอกว่ารออีกกี่นาที */
  assertNotLocked(email: string, now = Date.now()) {
    const entry = this.attempts.get(this.key(email));
    if (!entry || entry.lockedUntil <= now) return;

    const minutes = Math.ceil((entry.lockedUntil - now) / 60_000);
    throw new HttpException(
      {
        message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
        code: 'TOO_MANY_ATTEMPTS',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(email: string, now = Date.now()) {
    this.prune(now);
    const key = this.key(email);
    const entry = this.attempts.get(key);

    // ไม่เคยผิด หรือผิดครั้งแรกนานเกินช่วงเวลาแล้ว เริ่มนับใหม่
    if (!entry || now - entry.firstAt > WINDOW_MS) {
      this.attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
      return;
    }

    entry.count += 1;
    if (entry.count >= MAX_FAILED_LOGINS) {
      entry.lockedUntil = now + LOCK_MS;
    }
  }

  /** ล็อกอินสำเร็จ ล้างประวัติการใส่ผิดของอีเมลนี้ */
  reset(email: string) {
    this.attempts.delete(this.key(email));
  }

  /** ทิ้งรายการที่หมดอายุแล้ว ไม่ให้ Map โตไปเรื่อย ๆ */
  private prune(now: number) {
    if (this.attempts.size < 1000) return;
    for (const [key, entry] of this.attempts) {
      if (entry.lockedUntil <= now && now - entry.firstAt > WINDOW_MS) {
        this.attempts.delete(key);
      }
    }
  }
}
