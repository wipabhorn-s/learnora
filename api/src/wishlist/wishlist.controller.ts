import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import { AddToWishlistDto } from '@/wishlist/dto/add-to-wishlist.dto';
import { FindWishlistDto } from '@/wishlist/dto/find-wishlist.dto';
import { WishlistService } from '@/wishlist/wishlist.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

@Roles(Role.STUDENT)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('course-ids')
  findWishlistCourseIds(@CurrentUser('sub') studentId: string) {
    return this.wishlistService.findWishlistCourseIds(studentId);
  }

  @Get('/')
  findWishlist(
    @CurrentUser('sub') studentId: string,
    @Query() findWishlistDto: FindWishlistDto,
  ) {
    return this.wishlistService.findWishlist(studentId, findWishlistDto);
  }

  @Post('/')
  addToWishlist(
    @CurrentUser('sub') studentId: string,
    @Body() addToWishlistDto: AddToWishlistDto,
  ) {
    return this.wishlistService.addToWishlist(studentId, addToWishlistDto);
  }

  @Delete(':courseId')
  removeFromWishlist(
    @CurrentUser('sub') studentId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.wishlistService.removeFromWishlist(studentId, courseId);
  }
}
