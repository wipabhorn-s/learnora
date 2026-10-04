import { OpnService } from '@/infrastructure/payment/opn.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [OpnService],
  exports: [OpnService],
})
export class PaymentModule {}
