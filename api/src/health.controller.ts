import { Public } from '@/common/decorator/public.decorator';
import { PrismaService } from '@/database/prisma.service';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * เช็กสุขภาพ API ไม่ตอบข้อมูลภายในใด ๆ
 *
 * GET /health ไม่แตะฐานข้อมูลโดยตั้งใจ: Render เรียกเป็นระยะและตัว ping กันหลับเรียกทุก 10 นาที
 * ถ้าแตะฐานข้อมูลทุกครั้ง Neon (แพ็กเกจฟรี) จะไม่ได้หลับเลยจนโควตารายเดือนหมดกลางเดือน
 * แล้วเว็บใช้ไม่ได้ทั้งเว็บ ส่วนการ deploy ที่ต่อฐานข้อมูลไม่ได้ยังถูกกันไว้ เพราะตอน start
 * รัน `prisma migrate deploy` ก่อน ซึ่งล้มถ้าต่อไม่ได้
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** API ยังทำงานอยู่ (ใช้กับ Render health check และตัว ping) */
  @SkipThrottle()
  @Get()
  check() {
    return { status: 'ok' };
  }

  /** เช็กว่าต่อฐานข้อมูลได้ด้วย ไว้เรียกเองหรือตั้ง cron ห่าง ๆ (ปลุกฐานข้อมูลทุกครั้งที่เรียก) */
  @Get('db')
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
