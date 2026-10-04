import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Instructor } from '@/common/decorator/instructor.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import { RecordPayoutDto } from '@/payout/dto/record-payout.dto';
import { SavePayoutAccountDto } from '@/payout/dto/save-payout-account.dto';
import { PayoutService } from '@/payout/payout.service';
import { Body, Controller, Get, Post, Put } from '@nestjs/common';

/** ฝั่งผู้สอน: ดูรายได้ และตั้งบัญชีรับเงิน */
@Instructor()
@Controller('instructor/earnings')
export class InstructorEarningsController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get()
  getEarnings(@CurrentUser('sub') instructorId: string) {
    return this.payoutService.getInstructorEarnings(instructorId);
  }

  @Put('account')
  saveAccount(
    @CurrentUser('sub') instructorId: string,
    @Body() dto: SavePayoutAccountDto,
  ) {
    return this.payoutService.savePayoutAccount(instructorId, dto);
  }
}

/** ฝั่งแอดมิน: ยอดค้างจ่ายของผู้สอนทุกคน และบันทึกการโอนเงิน */
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/payouts')
export class AdminPayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get()
  getOverview() {
    return this.payoutService.getAdminOverview();
  }

  @Post()
  recordPayout(
    @CurrentUser('sub') adminId: string,
    @Body() dto: RecordPayoutDto,
  ) {
    return this.payoutService.recordPayout(adminId, dto);
  }
}
