// api\src\auth\email-verification-token.service.ts

import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class EmailVerificationTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  private hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * ออกลิงก์ใหม่ = ยกเลิกลิงก์เก่าที่ยังไม่ถูกใช้ทั้งหมดของ user คนนั้น
   * เพื่อไม่ให้คำขอเปลี่ยนอีเมลที่ถูกยกเลิกไปแล้วยังกดยืนยันได้อยู่
   *
   * คืน token ตัวจริงกลับไปครั้งเดียวสำหรับใส่ในลิงก์ ในฐานข้อมูลเก็บแค่ hash
   */
  async issue(userId: string, pendingEmail?: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresInSec = this.configService.get(
      'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN',
      { infer: true },
    );

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId, usedAt: null },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId,
          pendingEmail: pendingEmail?.toLowerCase(),
          tokenHash: this.hash(raw),
          expiresAt: new Date(Date.now() + expiresInSec * 1000),
        },
      }),
    ]);

    return raw;
  }

  findUsable(rawToken: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: this.hash(rawToken),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  /** ทิ้งลิงก์ที่ยังไม่ถูกใช้ทั้งหมดของ user คนนั้น */
  async discardPending(userId: string) {
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    });
  }

  markUsed(id: string) {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
