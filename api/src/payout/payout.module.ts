import {
  AdminPayoutController,
  InstructorEarningsController,
} from '@/payout/payout.controller';
import { PayoutService } from '@/payout/payout.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [InstructorEarningsController, AdminPayoutController],
  providers: [PayoutService],
})
export class PayoutModule {}
