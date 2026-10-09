// api\src\user\user.controller.ts

import { VerifyLoginCodeDto } from '@/auth/dto/verify-login-code.dto';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { BecomeInstructorDto } from '@/user/dto/become-instructor.dto';
import { ChangeEmailDto } from '@/user/dto/change-email.dto';
import { ChangePasswordDto } from '@/user/dto/change-password.dto';
import { ConnectGoogleDto } from '@/user/dto/connect-google.dto';
import { DisableTwoFactorDto } from '@/user/dto/disable-two-factor.dto';
import { DeleteAccountDto } from '@/user/dto/delete-account.dto';
import { RequestDeleteCodeDto } from '@/user/dto/request-delete-code.dto';
import { SetPasswordDto } from '@/user/dto/set-password.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserService } from '@/user/user.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CredentialThrottle,
  EmailThrottle,
} from '@/common/decorator/throttle.decorator';
import { IMAGE_UPLOAD } from '@/common/upload/upload-options';

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
  @UseInterceptors(FileInterceptor('avatarUrl', IMAGE_UPLOAD))
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

  /** ออกจากระบบทุกเครื่อง (รวมเครื่องนี้) */
  @HttpCode(HttpStatus.OK)
  @Post('me/sessions/revoke-all')
  logoutAllDevices(@CurrentUser('sub') userId: string) {
    return this.userService.logoutAllDevices(userId);
  }

  @CredentialThrottle()
  @Patch('me/password')
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, changePasswordDto);
  }

  // --- หน้า Login & security ---

  @Get('me/security')
  getSecurityOverview(@CurrentUser('sub') userId: string) {
    return this.userService.getSecurityOverview(userId);
  }

  /** ตั้งรหัสผ่านครั้งแรก สำหรับบัญชีที่สมัครมาทาง Google */
  @HttpCode(HttpStatus.OK)
  @Post('me/password')
  setPassword(
    @CurrentUser('sub') userId: string,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    return this.userService.setPassword(userId, setPasswordDto.newPassword);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/google')
  connectGoogle(
    @CurrentUser('sub') userId: string,
    @Body() connectGoogleDto: ConnectGoogleDto,
  ) {
    return this.userService.connectGoogleWithIdToken(
      userId,
      connectGoogleDto.idToken,
    );
  }

  @Delete('me/google')
  disconnectGoogle(@CurrentUser('sub') userId: string) {
    return this.userService.disconnectGoogle(userId);
  }

  /** ส่งลิงก์ยืนยันไปที่อีเมลใหม่ ยังไม่เปลี่ยนจนกว่าจะกดยืนยัน */
  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('me/email-change')
  changeEmail(
    @CurrentUser('sub') userId: string,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.userService.changeEmail(userId, changeEmailDto);
  }

  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('me/two-factor/request')
  requestEnableTwoFactor(@CurrentUser('sub') userId: string) {
    return this.userService.requestEnableTwoFactor(userId);
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('me/two-factor/confirm')
  confirmEnableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyLoginCodeDto,
  ) {
    return this.userService.confirmEnableTwoFactor(
      userId,
      dto.challengeId,
      dto.code,
    );
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('me/two-factor/disable')
  disableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: DisableTwoFactorDto,
  ) {
    return this.userService.disableTwoFactor(userId, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/instructor')
  becomeInstructor(
    @CurrentUser('sub') userId: string,
    @Body() dto: BecomeInstructorDto,
  ) {
    return this.userService.becomeInstructor(userId, dto.acceptTerms);
  }

  /** บัญชีที่ไม่มีรหัสผ่าน: ขอรหัสยืนยันการลบบัญชีทางอีเมล */
  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('me/delete/request-code')
  requestDeleteAccountCode(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestDeleteCodeDto,
  ) {
    return this.userService.requestDeleteAccountCode(userId, dto.email);
  }

  /** ลบบัญชีตัวเอง ใช้ POST เพราะต้องส่งรหัสผ่าน/รหัสยืนยันใน body (DELETE ไม่ควรมี body) */
  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('me/delete')
  deleteAccount(
    @CurrentUser('sub') userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.userService.deleteAccount(userId, dto);
  }
}
