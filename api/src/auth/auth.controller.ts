// api\src\auth\auth.controller.ts

import { AuthService } from '@/auth/auth.service';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from '@/auth/dto/google-login.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
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

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return { message: 'Register successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('google')
  loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  @Protected()
  @Get('profile')
  getCurrentUser(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  requestPasswordReset(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
