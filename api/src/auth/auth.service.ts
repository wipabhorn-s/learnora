// api\src\auth\auth.service.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from '@/auth/dto/google-login.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { GoogleAuthService } from '@/auth/google-auth.service';
import { ResetTokenService } from '@/auth/reset-token.service';
import { ResetTokenPayload } from '@/auth/types/jwt-payload';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { UserService } from '@/user/user.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly bcryptService: BcryptService,
    private readonly accessTokenService: AccessTokenService,
    private readonly resetTokenService: ResetTokenService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async register(dto: RegisterDto) {
    await this.userService.createUser(dto);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.bcryptService.compare(
      dto.password,
      user.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.status) {
      throw new ForbiddenException('Your account has been suspended');
    }

    const access_token = await this.accessTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { password, ...rest } = user;
    return { access_token, user: rest };
  }

  async getProfile(userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const message = 'If the email exists, a reset link has been sent';
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      return { message };
    }

    const resetToken = await this.resetTokenService.sign({ sub: user.id });
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    this.logger.log(`Reset token: ${resetToken}`);
    this.logger.log(`Reset link: ${resetUrl}`);

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: ResetTokenPayload;

    try {
      payload = await this.resetTokenService.verify(dto.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userService.updatePassword(user.id, dto.newPassword);

    return { message: 'Password reset successfully' };
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    const profile = await this.googleAuthService.verify(dto.idToken);

    let user = await this.userService.findByGoogleId(profile.googleId);

    if (!user) {
      const existing = await this.userService.findByEmail(profile.email);

      user = existing
        ? await this.userService.linkGoogleAccount(
            existing.id,
            profile.googleId,
          )
        : await this.userService.createGoogleUser(profile);
    }

    if (!user.status) {
      throw new ForbiddenException('Your account has been suspended');
    }

    const access_token = await this.accessTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { password, ...rest } = user;
    return { access_token, user: rest };
  }
}
