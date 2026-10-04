import { CheckoutDto } from '@/purchase/dto/checkout.dto';
import { RequestRefundDto } from '@/purchase/dto/request-refund.dto';
import { PurchaseService } from '@/purchase/purchase.service';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

@Roles(Role.STUDENT)
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @HttpCode(HttpStatus.OK)
  @Post('checkout')
  checkout(
    @CurrentUser('sub') studentId: string,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.purchaseService.checkout(studentId, checkoutDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('enroll-free/:courseId')
  enrollFree(
    @CurrentUser('sub') studentId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.purchaseService.enrollFree(studentId, courseId);
  }

  @Get('/')
  findPurchases(@CurrentUser('sub') studentId: string) {
    return this.purchaseService.findPurchases(studentId);
  }

  /** หน้ารอผลการจ่ายเงินเรียกซ้ำเป็นระยะ (QR พร้อมเพย์, กลับจากธนาคาร/3-D Secure) */
  @Get(':purchaseId/progress')
  getPaymentProgress(
    @CurrentUser('sub') studentId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ) {
    return this.purchaseService.getPaymentProgress(studentId, purchaseId);
  }

  /** ขอคืนเงินทีละคอร์ส: สร้างคำขอให้แอดมินพิจารณา ยังไม่คืนเงินทันที */
  @Post('items/:purchaseItemId/refund-request')
  requestRefund(
    @CurrentUser('sub') studentId: string,
    @Param('purchaseItemId', ParseUUIDPipe) purchaseItemId: string,
    @Body() dto: RequestRefundDto,
  ) {
    return this.purchaseService.requestRefund(studentId, purchaseItemId, dto);
  }

  @Get(':purchaseId')
  findPurchase(
    @CurrentUser('sub') studentId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ) {
    return this.purchaseService.findPurchase(studentId, purchaseId);
  }
}
