// api\src\auth\auth.controller.ts

import { AuthService } from '@/auth/auth.service';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from '@/auth/dto/google-login.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ResendLoginCodeDto } from '@/auth/dto/resend-login-code.dto';
import { ResendVerificationDto } from '@/auth/dto/resend-verification.dto';
import { VerifyLoginCodeDto } from '@/auth/dto/verify-login-code.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { VerifyEmailDto } from '@/auth/dto/verify-email.dto';
import { ClientIp } from '@/common/decorator/client-ip.decorator';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Protected, Public } from '@/common/decorator/public.decorator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  CredentialThrottle,
  EmailThrottle,
  RefreshThrottle,
} from '@/common/decorator/throttle.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @EmailThrottle()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return {
      message: 'Register successfully. Check your inbox to verify your email.',
    };
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @ClientIp() ip: string) {
    return this.authService.login(loginDto, ip);
  }

  /** ขั้นที่ 2 ของการล็อกอินเมื่อเปิด 2FA: รหัส 6 หลักจากอีเมล */
  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('login/code')
  verifyLoginCode(@Body() verifyLoginCodeDto: VerifyLoginCodeDto) {
    return this.authService.verifyLoginCode(verifyLoginCodeDto);
  }

  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('login/code/resend')
  resendLoginCode(@Body() resendLoginCodeDto: ResendLoginCodeDto) {
    return this.authService.resendLoginCode(resendLoginCodeDto);
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('google')
  loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  /** แลก refresh token เป็น access token ใบใหม่ (ไม่ต้องล็อกอินซ้ำ) */
  @HttpCode(HttpStatus.OK)
  @RefreshThrottle()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /** Log out เครื่องนี้: ยกเลิก refresh token (ไม่ต้องมี access token เพราะอาจหมดอายุแล้ว) */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Protected()
  @Get('profile')
  getCurrentUser(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('resend-verification')
  resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  @HttpCode(HttpStatus.OK)
  @EmailThrottle()
  @Post('forgot-password')
  requestPasswordReset(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto);
  }

  @HttpCode(HttpStatus.OK)
  @CredentialThrottle()
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
