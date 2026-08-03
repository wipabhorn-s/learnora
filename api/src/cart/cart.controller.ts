import { AddToCartDto } from '@/cart/dto/add-to-cart.dto';
import { CartService } from '@/cart/cart.service';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

@Roles(Role.STUDENT)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('/')
  findCart(@CurrentUser('sub') studentId: string) {
    return this.cartService.findCart(studentId);
  }

  @Post('/')
  addToCart(
    @CurrentUser('sub') studentId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(studentId, addToCartDto);
  }

  @Delete(':courseId')
  removeFromCart(
    @CurrentUser('sub') studentId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.cartService.removeFromCart(studentId, courseId);
  }
}
