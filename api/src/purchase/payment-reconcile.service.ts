import { PurchaseService } from '@/purchase/purchase.service';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

/** ถี่พอให้รายการค้างถูกปิดภายในไม่กี่นาที ไม่ถี่จนเปลือง API ของ Opn */
export const RECONCILE_INTERVAL_MS = 2 * 60 * 1000;
/**
 * เหลือแต่รายการยกเลิกแล้วที่อาจถูกจ่ายทีหลัง: เช็กห่าง ๆ พอ
 * นานกว่า 5 นาทีที่ Neon (แพ็กเกจฟรี) ใช้ตัดสินว่าว่าง ฐานข้อมูลจึงได้หลับระหว่างรอบ
 */
export const WATCH_INTERVAL_MS = 30 * 60 * 1000;

/**
 * ตรวจทานคำสั่งซื้อที่ค้างกับ Opn เป็นระยะ (ดู PurchaseService.reconcile)
 * ใช้ setInterval ธรรมดาแทน cron library เพราะงานเดียวและไม่ต้องตรงเวลา
 * ทุกขั้นเรียกซ้ำได้ รันพร้อมกันหลาย instance ก็ไม่เปิดคอร์ส/คืนเงินซ้ำ
 *
 * แตะฐานข้อมูลเฉพาะตอนมีงาน: ถ้าแตะทุก 2 นาทีตลอดเวลา Neon จะไม่ได้หลับเลย
 * แล้วโควตาฟรีรายเดือนหมดกลางเดือน (เว็บใช้ไม่ได้ทั้งเว็บ)
 * - มีรายการรอจ่าย หรือเพิ่งมีการเริ่ม/ยกเลิกการชำระเงิน → ทุกรอบ (2 นาที)
 * - เหลือแต่รายการยกเลิกที่ต้องเฝ้าไว้คืนเงิน → ทุก 30 นาที
 * - ไม่มีอะไรค้าง → ไม่แตะฐานข้อมูลจนกว่าจะมีการชำระเงินครั้งใหม่
 */
@Injectable()
export class PaymentReconcileService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentReconcileService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  /** 0 = รอบแรกหลังเปิดเครื่องตรวจทันที (เผื่อมีรายการค้างจากก่อนรีสตาร์ต) */
  private nextRunAt = 0;
  private lastRunStartedAt = 0;

  constructor(private readonly purchaseService: PurchaseService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.tick(), RECONCILE_INTERVAL_MS);
    // ไม่ขวางการปิดโปรแกรม
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /** เรียกทุก RECONCILE_INTERVAL_MS ตัดสินว่ารอบนี้ต้องแตะฐานข้อมูลไหม */
  async tick(now = Date.now()) {
    // รอบก่อนยังไม่เสร็จ (Opn ตอบช้า) ข้ามรอบนี้ไป ไม่ให้ซ้อนกัน
    if (this.running) return;
    const newActivity =
      this.purchaseService.lastPaymentActivityAt >= this.lastRunStartedAt;
    if (!newActivity && now < this.nextRunAt) return;

    this.running = true;
    this.lastRunStartedAt = now;
    try {
      const { pending, watching } = await this.purchaseService.reconcile();
      this.nextRunAt =
        pending > 0
          ? 0
          : watching > 0
            ? now + WATCH_INTERVAL_MS
            : Number.POSITIVE_INFINITY;
    } catch (error) {
      // ฐานข้อมูล/Opn มีปัญหา: ลองใหม่รอบถัดไป
      this.nextRunAt = 0;
      this.logger.error('Payment reconcile failed', error);
    } finally {
      this.running = false;
    }
  }
}
