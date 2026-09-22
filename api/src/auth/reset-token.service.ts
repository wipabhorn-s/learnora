// api\src\auth\reset-token.service.ts

import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

/**
 * เดิมลิงก์ตั้งรหัสผ่านใหม่เป็น JWT ล้วน ซึ่งเพิกถอนไม่ได้ กดเปลี่ยนรหัสไปแล้ว
 * ลิงก์เดิมก็ยังใช้เปลี่ยนซ้ำได้อีกจนกว่าจะหมดอายุ จึงย้ายมาเก็บเป็นแถวใน
 * ฐานข้อมูลแทน เพื่อให้ปิดการใช้งานทันทีที่ถูกใช้ (usedAt) และเก็บเฉพาะ hash
 */
@Injectable()
export class ResetTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  private hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async issue(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresInSec = this.configService.get('RESET_TOKEN_EXPIRES_IN', {
      infer: true,
    });

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId, usedAt: null },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: this.hash(raw),
          expiresAt: new Date(Date.now() + expiresInSec * 1000),
        },
      }),
    ]);

    return raw;
  }

  findUsable(rawToken: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hash(rawToken),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  markUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
