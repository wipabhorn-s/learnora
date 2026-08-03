import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { ChangePasswordDto } from '@/user/dto/change-password.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserService } from '@/user/user.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('me')
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatarUrl'))
  updateAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    if (!avatarFile) {
      throw new BadRequestException('Avatar file is required');
    }
    return this.userService.updateAvatar(userId, avatarFile);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser('sub') userId: string) {
    return this.userService.removeAvatar(userId);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, changePasswordDto);
  }
}
