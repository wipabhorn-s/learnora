import { Public } from '@/common/decorator/public.decorator';
import { OpnService } from '@/infrastructure/payment/opn.service';
import { PurchaseService } from '@/purchase/purchase.service';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  type RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';

type OpnEvent = { key?: string; data?: { object?: string; id?: string } };

/**
 * ปลายทาง webhook ของ Opn Payments (ตั้งใน Dashboard > Webhooks)
 * ต้องเข้าถึงได้โดยไม่ล็อกอิน จึงตรวจลายเซ็นแทน แล้วถามสถานะจริงจาก Opn อีกชั้น
 */
@Public()
// Opn ส่ง webhook ซ้ำได้เมื่อเราตอบช้า/ล้มเหลว และทุกคำขอมาจาก IP ของ Opn ไม่จำกัด
@SkipThrottle()
@Controller('payments/opn')
export class PaymentWebhookController {
  constructor(
    private readonly opnService: OpnService,
    private readonly purchaseService: PurchaseService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Body() event: OpnEvent,
    @Headers('omise-signature') signature?: string,
    @Headers('omise-signature-timestamp') timestamp?: string,
  ) {
    if (
      !request.rawBody ||
      !this.opnService.verifyWebhook(request.rawBody, signature, timestamp)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // event อื่นตอบ 200 เฉย ๆ ไม่งั้น Opn จะส่งซ้ำไปเรื่อย ๆ
    if (event.key === 'charge.complete' && event.data?.id) {
      await this.purchaseService.handleChargeComplete(event.data.id);
    }

    return { received: true };
  }
}
