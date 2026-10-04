// api\src\auth\one-time-code.service.ts

import { EnvVariable } from '@/config/env.validation';
import { OtpPurpose } from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/** ต้องตรงกับ RESEND_COOLDOWN_SECONDS ฝั่งเว็บ */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/**
 * รหัส 6 หลักที่ส่งทางอีเมล ใช้ทั้งตอนล็อกอิน (2FA) และตอนเปิดใช้ 2FA
 *
 * - เก็บเป็น HMAC ด้วย ACCESS_TOKEN_SECRET ไม่ใช่ sha256 เปล่า ๆ เพราะรหัส
 *   มีแค่ล้านแบบ ถ้าฐานข้อมูลหลุด sha256 ไล่เดาครบได้ในเสี้ยววินาที
 * - ออกรหัสใหม่ = ทิ้งรหัสเก่าที่ยังไม่ใช้ของจุดประสงค์เดียวกันทั้งหมด
 * - ผิดครบ 5 ครั้ง รหัสนั้นใช้ไม่ได้อีก ต้องขอใหม่ (ซึ่งติด cooldown 30 วิ)
 *   จึงเดาได้อย่างมากราว 10 ครั้งต่อนาที จากล้านแบบ
 */
@Injectable()
export class OneTimeCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  private hash(id: string, code: string): string {
    return crypto
      .createHmac(
        'sha256',
        this.configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
      )
      .update(`${id}:${code}`)
      .digest('hex');
  }

  /** คืน id (ใช้เป็น challengeId) กับรหัสตัวจริงครั้งเดียว ในฐานข้อมูลเก็บแค่ hash */
  async issue(
    userId: string,
    purpose: OtpPurpose,
  ): Promise<{ id: string; code: string }> {
    const id = crypto.randomUUID();
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.prisma.$transaction([
      this.prisma.oneTimeCode.deleteMany({
        where: { userId, purpose, usedAt: null },
      }),
      this.prisma.oneTimeCode.create({
        data: {
          id,
          userId,
          purpose,
          codeHash: this.hash(id, code),
          expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    return { id, code };
  }

  /** หาคำขอที่ยังไม่ถูกใช้ ใช้ตอนขอส่งรหัสใหม่ (ยอมให้หมดอายุหรือโดนล็อกแล้วได้) */
  findPending(id: string, purpose: OtpPurpose) {
    return this.prisma.oneTimeCode.findFirst({
      where: { id, purpose, usedAt: null },
    });
  }

  isCoolingDown(createdAt: Date): boolean {
    return (
      Date.now() - createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000
    );
  }

  /**
   * ตรวจรหัส ผ่านแล้วปิดใช้ทันทีแล้วคืน userId ไม่ผ่านโยน 400 พร้อม code
   * ให้หน้าเว็บบอกได้ตรงว่าผิด หมดอายุ หรือผิดเกินจำนวนครั้ง
   */
  async verify(id: string, code: string, purpose: OtpPurpose): Promise<string> {
    const record = await this.findPending(id, purpose);

    if (!record || record.expiresAt <= new Date()) {
      throw new BadRequestException({
        message: 'This code has expired. Request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException({
        message: 'Too many incorrect attempts. Request a new code.',
        code: 'OTP_LOCKED',
      });
    }

    const expected = Buffer.from(record.codeHash, 'hex');
    const actual = Buffer.from(this.hash(record.id, code), 'hex');

    if (!crypto.timingSafeEqual(expected, actual)) {
      const { attempts } = await this.prisma.oneTimeCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });
      const remaining = MAX_ATTEMPTS - attempts;

      throw new BadRequestException(
        remaining > 0
          ? {
              message: `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`,
              code: 'OTP_INVALID',
            }
          : {
              message: 'Too many incorrect attempts. Request a new code.',
              code: 'OTP_LOCKED',
            },
      );
    }

    await this.prisma.oneTimeCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record.userId;
  }
}
