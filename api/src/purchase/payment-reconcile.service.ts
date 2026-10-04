import { PurchaseService } from '@/purchase/purchase.service';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

/** ถี่พอให้รายการค้างถูกปิดภายในไม่กี่นาที ไม่ถี่จนเปลือง API ของ Opn */
const RECONCILE_INTERVAL_MS = 2 * 60 * 1000;

/**
 * ตรวจทานคำสั่งซื้อที่ค้างกับ Opn เป็นระยะ (ดู PurchaseService.reconcile)
 * ใช้ setInterval ธรรมดาแทน cron library เพราะงานเดียวและไม่ต้องตรงเวลา
 * ทุกขั้นเรียกซ้ำได้ รันพร้อมกันหลาย instance ก็ไม่เปิดคอร์ส/คืนเงินซ้ำ
 */
@Injectable()
export class PaymentReconcileService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentReconcileService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly purchaseService: PurchaseService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.run(), RECONCILE_INTERVAL_MS);
    // ไม่ขวางการปิดโปรแกรม
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  private async run() {
    // รอบก่อนยังไม่เสร็จ (Opn ตอบช้า) ข้ามรอบนี้ไป ไม่ให้ซ้อนกัน
    if (this.running) return;
    this.running = true;
    try {
      await this.purchaseService.reconcile();
    } catch (error) {
      this.logger.error('Payment reconcile failed', error);
    } finally {
      this.running = false;
    }
  }
}
