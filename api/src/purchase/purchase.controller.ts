import { CheckoutDto } from '@/purchase/dto/checkout.dto';
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

  @Get('/')
  findPurchases(@CurrentUser('sub') studentId: string) {
    return this.purchaseService.findPurchases(studentId);
  }

  @Get(':purchaseId')
  findPurchase(
    @CurrentUser('sub') studentId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ) {
    return this.purchaseService.findPurchase(studentId, purchaseId);
  }
}
