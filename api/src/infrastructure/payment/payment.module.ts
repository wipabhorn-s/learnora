import { StripeService } from '@/infrastructure/payment/stripe.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}
