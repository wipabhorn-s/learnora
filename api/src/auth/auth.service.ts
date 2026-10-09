// api\src\auth\auth.service.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from '@/auth/dto/google-login.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ResendVerificationDto } from '@/auth/dto/resend-verification.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { VerifyEmailDto } from '@/auth/dto/verify-email.dto';
import { EmailVerificationTokenService } from '@/auth/email-verification-token.service';
import { VerifyLoginCodeDto } from '@/auth/dto/verify-login-code.dto';
import { ResendLoginCodeDto } from '@/auth/dto/resend-login-code.dto';
import { GoogleAuthService } from '@/auth/google-auth.service';
import { LoginAttemptService } from '@/auth/login-attempt.service';
import { OneTimeCodeService } from '@/auth/one-time-code.service';
import { RefreshTokenService } from '@/auth/refresh-token.service';
import { ResetTokenService } from '@/auth/reset-token.service';
import { OtpPurpose, Role } from '@/database/generated/prisma/enums';
import { MailService } from '@/infrastructure/mail/mail.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { UserService } from '@/user/user.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * ข้อความ error ของการล็อกอินแยกตามสาเหตุเฉพาะหลังรหัสผ่านถูกแล้ว (บัญชีถูกระงับ,
 * ยังไม่ยืนยันอีเมล) คนที่รู้รหัสผ่านคือเจ้าของ บอกได้ว่าต้องทำอะไรต่อ
 *
 * ส่วนก่อนตรวจรหัสผ่าน (ไม่มีอีเมลนี้ / บัญชี Google ที่ไม่มีรหัส / รหัสผิด)
 * ตอบข้อความเดียวกันหมด เพื่อไม่ให้ใช้หน้าล็อกอินไล่เดาว่าอีเมลไหนมีอยู่ในระบบ
 */
const INVALID_CREDENTIALS = 'Invalid email or password';

/** ต้องตรงกับ RESEND_COOLDOWN_SECONDS ฝั่งเว็บ ที่นับถอยหลังบนปุ่ม */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * ลิงก์ล่าสุดเพิ่งออกไปไม่ถึง 30 วินาที = ไม่ส่งเมลซ้ำ ผู้เรียกต้องตอบข้อความ
 * เดิมเหมือนทุกกรณี ถ้าตอบ 429 จะกลายเป็นบอกคนนอกว่าอีเมลนี้มีบัญชีอยู่
 * หน้าเว็บนับถอยหลังบนปุ่มเองอยู่แล้ว ผู้ใช้ปกติจึงไม่ชนเงื่อนไขนี้
 */
function isCoolingDown(lastIssuedAt: Date | null): boolean {
  return (
    lastIssuedAt !== null &&
    Date.now() - lastIssuedAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
  );
}

type SessionUser = {
  id: string;
  email: string;
  role: Role;
  isInstructor: boolean;
  sessionVersion: number;
  password?: string | null;
};

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
    private readonly oneTimeCodeService: OneTimeCodeService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  private signAccessToken(user: SessionUser) {
    return this.accessTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      isInstructor: user.isInstructor,
      ver: user.sessionVersion,
    });
  }

  /** ล็อกอินสำเร็จ: access token อายุสั้น + refresh token ใบแรกของ family ใหม่ */
  private async issueSession(user: SessionUser) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user),
      this.refreshTokenService.issue(user.id),
    ]);

    const { password: _password, ...rest } = user;
    return { access_token, refresh_token, user: rest };
  }

  /**
   * แลก refresh token เป็น access token ใบใหม่ (และ refresh token ใบใหม่)
   * ดึงข้อมูลผู้ใช้ล่าสุดจากฐานข้อมูลทุกครั้ง สิทธิ์ที่เปลี่ยนไป (เช่นเปิดสิทธิ์สอน)
   * จึงมาถึงหน้าเว็บเองโดยไม่ต้องล็อกอินใหม่
   */
  async refresh(dto: RefreshTokenDto) {
    const { userId, refreshToken } = await this.refreshTokenService.rotate(
      dto.refreshToken,
    );

    const user = await this.userService.findById(userId);
    if (!user || !user.status || user.deletedAt) {
      await this.refreshTokenService.revokeAllForUser(userId);
      throw new UnauthorizedException({
        message: 'Your session is no longer valid. Please log in again.',
        code: 'SESSION_INVALID',
      });
    }

    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      user,
    };
  }

  /** Log out เครื่องนี้: ยกเลิก refresh token ของ session นี้ */
  async logout(dto: RefreshTokenDto) {
    await this.refreshTokenService.revoke(dto.refreshToken);
    return { message: 'Logged out' };
  }

  /**
   * ส่งเมลแบบไม่ให้ล้มคำขอหลัก — ถ้า Brevo ล่มหรือยังไม่ได้ตั้ง key
   * ผู้ใช้ควรได้บัญชีที่สมัครสำเร็จไว้ก่อน แล้วค่อยกด "ส่งลิงก์อีกครั้ง"
   * ดีกว่าโยน 500 ทิ้งทั้งที่แถวใน users ถูกสร้างไปแล้ว
   */
  /** hash ไว้เทียบเล่น ๆ ตอนไม่มีรหัสจริงให้เทียบ ให้ล็อกอินพลาดทุกแบบใช้เวลาเท่ากัน */
  private dummyHash?: Promise<string>;

  private dummyPasswordHash(): Promise<string> {
    this.dummyHash ??= this.bcryptService.hash('learnora-dummy-password');
    return this.dummyHash;
  }

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

  /**
   * สมัครด้วยอีเมลที่มีบัญชีอยู่แล้ว ตอบเหมือนสมัครสำเร็จทุกอย่าง ไม่บอกว่า "อีเมลนี้มีคนใช้แล้ว"
   * ไม่งั้นใครก็ไล่เช็กได้ว่าอีเมลไหนเป็นสมาชิก (email enumeration) แล้วเอาไปหลอกต่อ
   * เจ้าของอีเมลตัวจริงจะได้เมลแทน: ยังไม่ยืนยัน = ลิงก์ยืนยันใหม่, ยืนยันแล้ว = แจ้งว่ามีบัญชีอยู่แล้ว
   */
  async register(dto: RegisterDto) {
    let user: { id: string; email: string };
    try {
      // acceptTerms ผ่าน DTO มาแล้ว (ต้องเป็น true) createUser บันทึกเวลาที่ยอมรับให้
      // createUser hash รหัสผ่านก่อนบันทึกเสมอ อีเมลซ้ำจึงใช้เวลาตอบพอ ๆ กับสมัครใหม่
      user = await this.userService.createUser({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
        isInstructor: dto.isInstructor ?? false,
      });
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      await this.notifyExistingAccount(dto.email);
      return;
    }

    const token = await this.emailVerificationTokenService.issue(user.id);
    await this.sendOrLog(
      () => this.mailService.sendEmailVerification(user.email, token),
      `register ${user.id}`,
    );
  }

  /** มีคนสมัครด้วยอีเมลของบัญชีที่มีอยู่แล้ว: บอกเจ้าของทางอีเมลเท่านั้น */
  private async notifyExistingAccount(email: string) {
    const existing = await this.userService.findByEmail(email);
    if (!existing) return;

    if (!existing.emailVerifiedAt) {
      // น่าจะเป็นเจ้าของที่ลืมกดยืนยัน ส่งลิงก์ใหม่ให้ (เว้นช่วงเหมือนปุ่มส่งซ้ำ)
      if (
        isCoolingDown(
          await this.emailVerificationTokenService.lastIssuedAt(existing.id),
        )
      ) {
        return;
      }
      const token = await this.emailVerificationTokenService.issue(existing.id);
      await this.sendOrLog(
        () => this.mailService.sendEmailVerification(existing.email, token),
        `register (unverified) ${existing.id}`,
      );
      return;
    }

    await this.sendOrLog(
      () => this.mailService.sendAccountExistsNotice(existing.email),
      `register (exists) ${existing.id}`,
    );
  }

  /** ip = IP จริงของผู้ใช้ (ใช้นับการใส่รหัสผิดแยกตามเครื่อง ดู LoginAttemptService) */
  async login(dto: LoginDto, ip: string) {
    // เช็กก่อนตรวจรหัสผ่าน: ระหว่างล็อกอยู่ใส่ถูกก็ไม่ผ่าน (ไม่งั้นเดาต่อได้)
    await this.loginAttemptService.assertNotLocked(dto.email, ip);

    const user = await this.userService.findByEmail(dto.email);

    // ไม่มีบัญชี / บัญชี Google ที่ยังไม่ตั้งรหัสผ่าน / รหัสผิด ตอบเหมือนกันหมด
    // ทั้งข้อความและเวลา (เทียบ bcrypt กับ hash หลอกเสมอ) ไม่งั้นไล่เช็กได้ว่าอีเมลไหนมีบัญชี
    // หน้าเว็บบอกไว้ในข้อความแล้วว่าสมัครด้วย Google ให้กด Continue with Google
    const isMatch = await this.bcryptService.compare(
      dto.password,
      user?.password ?? (await this.dummyPasswordHash()),
    );

    if (!user?.password || !isMatch) {
      await this.loginAttemptService.recordFailure(dto.email, ip);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    await this.loginAttemptService.reset(dto.email, ip);

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

    // เปิด 2FA ไว้: รหัสผ่านถูกยังไม่พอ ส่งรหัส 6 หลักไปทางอีเมลก่อน แล้วค่อย
    // ออก token ที่ /auth/login/code ตอบ 200 ไม่ใช่ 401 เพราะไม่ได้ผิดอะไร
    // แค่ยังไม่จบขั้นตอน (และบอกคนนอกได้แค่ว่ารหัสผ่านถูก ซึ่งเขารู้อยู่แล้ว)
    if (user.twoFactorEnabled) {
      const challengeId = await this.sendLoginCode(user.id, user.email);
      return { codeRequired: true as const, challengeId };
    }

    return this.issueSession(user);
  }

  /**
   * ส่งรหัสแบบต้องสำเร็จ ต่างจาก sendOrLog ที่กลืน error — ถ้าเมลไม่ออก
   * ผู้ใช้จะนั่งรอรหัสที่ไม่มีวันมา ต้องบอกให้รู้ว่าลองใหม่
   */
  private async sendLoginCode(userId: string, email: string): Promise<string> {
    const { id, code } = await this.oneTimeCodeService.issue(
      userId,
      OtpPurpose.LOGIN,
    );

    try {
      await this.mailService.sendOneTimeCode(email, code, OtpPurpose.LOGIN);
    } catch (error) {
      this.logger.error(`ส่งรหัสล็อกอินไม่สำเร็จ (${userId})`, error);
      throw new ServiceUnavailableException({
        message: 'We could not send your verification code. Please try again.',
        code: 'SERVICE_UNAVAILABLE',
      });
    }

    return id;
  }

  async verifyLoginCode(dto: VerifyLoginCodeDto) {
    const userId = await this.oneTimeCodeService.verify(
      dto.challengeId,
      dto.code,
      OtpPurpose.LOGIN,
    );
    const user = await this.userService.findById(userId);

    // ระหว่างรอใส่รหัส บัญชีอาจโดนระงับไปแล้ว
    if (!user?.status) {
      throw new ForbiddenException({
        message: 'Your account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    return this.issueSession(user);
  }

  /** ส่งรหัสใหม่ คืน challengeId ใบใหม่ (ใบเก่าถูกทิ้งไปแล้ว) */
  async resendLoginCode(dto: ResendLoginCodeDto) {
    const pending = await this.oneTimeCodeService.findPending(
      dto.challengeId,
      OtpPurpose.LOGIN,
    );

    if (!pending) {
      throw new BadRequestException({
        message: 'Your login session has expired. Please log in again.',
        code: 'OTP_SESSION_EXPIRED',
      });
    }

    if (this.oneTimeCodeService.isCoolingDown(pending.createdAt)) {
      throw new BadRequestException({
        message: 'Please wait a moment before requesting another code.',
        code: 'OTP_COOLDOWN',
      });
    }

    const user = await this.userService.findById(pending.userId);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const challengeId = await this.sendLoginCode(user.id, user.email);
    return { challengeId, message: 'A new code has been sent to your email' };
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

    if (
      isCoolingDown(
        await this.emailVerificationTokenService.lastIssuedAt(user.id),
      )
    ) {
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

    if (
      !user ||
      isCoolingDown(await this.resetTokenService.lastIssuedAt(user.id))
    ) {
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
    // รีเซ็ตรหัสผ่าน = อาจมีคนอื่นรู้รหัสเดิม ออกจากระบบทุกเครื่อง
    await this.refreshTokenService.revokeAllForUser(token.userId);

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
        ? await this.userService.linkGoogleAccount(
            existing.id,
            profile.googleId,
          )
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
