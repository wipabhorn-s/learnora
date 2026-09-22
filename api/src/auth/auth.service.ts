// api\src\auth\auth.service.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from '@/auth/dto/google-login.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ResendVerificationDto } from '@/auth/dto/resend-verification.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { VerifyEmailDto } from '@/auth/dto/verify-email.dto';
import { EmailVerificationTokenService } from '@/auth/email-verification-token.service';
import { GoogleAuthService } from '@/auth/google-auth.service';
import { ResetTokenService } from '@/auth/reset-token.service';
import { Role } from '@/database/generated/prisma/enums';
import { MailService } from '@/infrastructure/mail/mail.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { UserService } from '@/user/user.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * ข้อความ error ของการล็อกอินตั้งใจแยกให้ชัดตามสาเหตุ เพราะเดิมทุกเคส
 * ถูกกลืนเป็น "Invalid email or password" หมด คนที่โดนระงับบัญชีหรือสมัคร
 * ด้วย Google ไว้จึงไม่มีทางรู้เลยว่าต้องทำอะไรต่อ
 *
 * ส่วนเคสที่บอกไม่ได้จริง ๆ (ไม่มีอีเมลนี้ / รหัสผิด) ยังคงตอบข้อความเดียวกัน
 * เพื่อไม่ให้ใช้หน้าล็อกอินไล่เดาว่าอีเมลไหนมีอยู่ในระบบ
 */
const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly bcryptService: BcryptService,
    private readonly accessTokenService: AccessTokenService,
    private readonly resetTokenService: ResetTokenService,
    private readonly emailVerificationTokenService: EmailVerificationTokenService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly mailService: MailService,
  ) {}

  private async issueSession(user: {
    id: string;
    email: string;
    role: Role;
    isInstructor: boolean;
    password?: string | null;
  }) {
    const access_token = await this.accessTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      isInstructor: user.isInstructor,
    });

    const { password: _password, ...rest } = user;
    return { access_token, user: rest };
  }

  /**
   * ส่งเมลแบบไม่ให้ล้มคำขอหลัก — ถ้า Brevo ล่มหรือยังไม่ได้ตั้ง key
   * ผู้ใช้ควรได้บัญชีที่สมัครสำเร็จไว้ก่อน แล้วค่อยกด "ส่งลิงก์อีกครั้ง"
   * ดีกว่าโยน 500 ทิ้งทั้งที่แถวใน users ถูกสร้างไปแล้ว
   */
  private async sendOrLog(
    action: () => Promise<void>,
    context: string,
  ): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error(`ส่งอีเมลไม่สำเร็จ (${context})`, error);
    }
  }

  async register(dto: RegisterDto) {
    const user = await this.userService.createUser({
      ...dto,
      isInstructor: dto.isInstructor ?? false,
    });

    const token = await this.emailVerificationTokenService.issue(user.id);
    await this.sendOrLog(
      () => this.mailService.sendEmailVerification(user.email, token),
      `register ${user.id}`,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // บัญชีที่สมัครผ่าน Google ยังไม่เคยตั้งรหัสผ่าน จึงเทียบรหัสไม่ได้
    // ต้องบอกให้ตรงว่าให้เข้าทาง Google แทน ไม่ใช่ปล่อยให้งงว่ารหัสผิด
    if (!user.password) {
      throw new UnauthorizedException({
        message:
          'This account was created with Google. Continue with Google, or use forgot password to set a password.',
        code: 'GOOGLE_ONLY_ACCOUNT',
      });
    }

    const isMatch = await this.bcryptService.compare(
      dto.password,
      user.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.status) {
      throw new ForbiddenException({
        message: 'Your account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // เช็กหลังตรวจรหัสผ่านผ่านแล้วเท่านั้น ไม่งั้นใครก็ยิงอีเมลมาไล่ถามได้ว่า
    // บัญชีไหนมีอยู่จริงแต่ยังไม่ยืนยัน
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return this.issueSession(user);
  }

  async getProfile(userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const token = await this.emailVerificationTokenService.findUsable(
      dto.token,
    );

    if (!token) {
      throw new UnauthorizedException(
        'This verification link is invalid or has expired',
      );
    }

    // pendingEmail มีค่า = คำขอเปลี่ยนอีเมล ไม่ใช่การยืนยันตอนสมัคร
    if (token.pendingEmail) {
      const taken = await this.userService.findByEmail(token.pendingEmail);

      // อีเมลปลายทางอาจถูกคนอื่นสมัครไปก่อนระหว่างที่ลิงก์ยังค้างอยู่
      if (taken && taken.id !== token.userId) {
        throw new ConflictException('That email is already in use');
      }

      await this.userService.applyEmailChange(token.userId, token.pendingEmail);
      await this.emailVerificationTokenService.markUsed(token.id);

      return { message: 'Email updated successfully' };
    }

    await this.userService.markEmailVerified(token.userId);
    await this.emailVerificationTokenService.markUsed(token.id);

    return { message: 'Email verified successfully' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const message = 'If the account needs verification, an email has been sent';
    const user = await this.userService.findByEmail(dto.email);

    if (!user || user.emailVerifiedAt) {
      return { message };
    }

    const token = await this.emailVerificationTokenService.issue(user.id);
    await this.sendOrLog(
      () => this.mailService.sendEmailVerification(user.email, token),
      `resend ${user.id}`,
    );

    return { message };
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const message = 'If the email exists, a reset link has been sent';
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      return { message };
    }

    const token = await this.resetTokenService.issue(user.id);
    await this.sendOrLog(
      () => this.mailService.sendPasswordResetEmail(user.email, token),
      `reset ${user.id}`,
    );

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.resetTokenService.findUsable(dto.token);

    if (!token) {
      throw new UnauthorizedException(
        'This reset link is invalid or has expired',
      );
    }

    await this.userService.updatePassword(token.userId, dto.newPassword);
    await this.resetTokenService.markUsed(token.id);

    // เจ้าของอีเมลกดลิงก์ได้ = พิสูจน์แล้วว่าเข้าถึงกล่องจดหมายนี้จริง
    // บัญชีที่ค้างไม่ยืนยันจึงถือว่ายืนยันไปในตัว ไม่ต้องส่งเมลซ้ำอีกฉบับ
    if (!token.user.emailVerifiedAt) {
      await this.userService.markEmailVerified(token.userId);
    }

    return { message: 'Password reset successfully' };
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    const profile = await this.googleAuthService.verify(dto.idToken);

    let user = await this.userService.findByGoogleId(profile.googleId);

    if (!user) {
      const existing = await this.userService.findByEmail(profile.email);

      // ผูกเข้าบัญชีเดิมได้เพราะ GoogleAuthService ปฏิเสธ token ที่
      // email_verified เป็น false ไปแล้ว — Google จึงยืนยันให้แล้วว่า
      // คนที่ล็อกอินอยู่เป็นเจ้าของอีเมลนี้จริง
      user = existing
        ? await this.userService.linkGoogleAccount(existing.id, profile.googleId)
        : await this.userService.createGoogleUser({
            ...profile,
            isInstructor: dto.asInstructor ?? false,
          });
    }

    if (!user.status) {
      throw new ForbiddenException({
        message: 'Your account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    return this.issueSession(user);
  }
}
