import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

/**
 * ค่า TRUST_PROXY แบบเดียวกับ Express "trust proxy":
 * ตัวเลข = จำนวน proxy ที่เชื่อ, true/false, หรือรายการ IP/subnet/คำพิเศษ (loopback, uniquelocal)
 */
function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

async function bootstrap() {
  // rawBody: webhook ของ Opn ต้องตรวจลายเซ็นกับ body ดิบ ก่อนถูกแปลงเป็น JSON
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // เชื่อ X-Forwarded-For จาก server ของเว็บเท่านั้น req.ip จึงเป็น IP จริงของผู้ใช้
  // (rate limit นับต่อ IP นี้ ถ้าไม่ตั้ง ทุกคนจะใช้โควตาร่วมกันเป็น IP ของ server เว็บ)
  app.set(
    'trust proxy',
    parseTrustProxy(process.env.TRUST_PROXY ?? 'loopback'),
  );

  // security header มาตรฐาน (nosniff, ห้ามฝังใน iframe ฯลฯ) API ตอบแค่ JSON
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
