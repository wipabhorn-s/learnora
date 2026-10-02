import { PaymentReconcileService } from '@/purchase/payment-reconcile.service';
import { PaymentWebhookController } from '@/purchase/payment-webhook.controller';
import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';

@Module({
  controllers: [PurchaseController, PaymentWebhookController],
  providers: [PurchaseService, PaymentReconcileService],
})
export class PurchaseModule {}
