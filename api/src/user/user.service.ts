// api\src\user\user.service.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { EmailVerificationTokenService } from '@/auth/email-verification-token.service';
import { GoogleAuthService, GoogleProfile } from '@/auth/google-auth.service';
import { OneTimeCodeService } from '@/auth/one-time-code.service';
import {
  OtpPurpose,
  Role,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { ChangeEmailDto } from '@/user/dto/change-email.dto';
import { ChangePasswordDto } from '@/user/dto/change-password.dto';
import { DeleteAccountDto } from '@/user/dto/delete-account.dto';
import { OTP_RESEND_COOLDOWN_SECONDS } from '@/auth/one-time-code.service';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserCreateInput } from '@/user/types/user.type';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly emailVerificationTokenService: EmailVerificationTokenService,
    private readonly mailService: MailService,
    private readonly accessTokenService: AccessTokenService,
    private readonly oneTimeCodeService: OneTimeCodeService,
  ) {}

  async createUser(input: UserCreateInput) {
    const hash = await this.bcryptService.hash(input.password);
    const { isInstructor, ...rest } = input;

    try {
      // emailVerifiedAt ปล่อยเป็น null ไว้ก่อน ต้องกดลิงก์ในเมลถึงจะล็อกอินได้
      return await this.prisma.user.create({
        data: {
          ...rest,
          password: hash,
          role: Role.STUDENT,
          isInstructor,
        },
        omit: { avatarPublicId: true },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      omit: { avatarPublicId: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true, avatarPublicId: true },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const hash = await this.bcryptService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      omit: { avatarPublicId: true },
    });
  }

  linkGoogleAccount(userId: string, googleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
      omit: { avatarPublicId: true },
    });
  }

  createGoogleUser(input: GoogleProfile & { isInstructor: boolean }) {
    return this.prisma.user.create({
      // Google ยืนยันอีเมลให้แล้ว (GoogleAuthService ปฏิเสธ token ที่
      // email_verified = false) จึงไม่ต้องให้กดลิงก์ยืนยันซ้ำอีกรอบ
      data: { ...input, role: Role.STUDENT, emailVerifiedAt: new Date() },
      omit: { avatarPublicId: true },
    });
  }

  markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      omit: { password: true, avatarPublicId: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        ...(dto.bio !== undefined && { bio: dto.bio || null }),
      },
      omit: { password: true, avatarPublicId: true },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, avatarPublicId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const avatar = await this.cloudinaryService.upload(file);

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: avatar.url,
          avatarPublicId: avatar.publicId,
        },
      });
    } catch (error) {
      await this.cloudinaryService.deleteAsset(avatar.publicId);
      throw error;
    }

    const oldAvatarPublicId =
      user.avatarPublicId ??
      this.cloudinaryService.getPublicIdFromUrl(user.avatarUrl);

    await this.cloudinaryService.deleteAsset(oldAvatarPublicId);

    return { url: avatar.url };
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, avatarPublicId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarPublicId: null,
      },
    });

    const avatarPublicId =
      user.avatarPublicId ??
      this.cloudinaryService.getPublicIdFromUrl(user.avatarUrl);

    await this.cloudinaryService.deleteAsset(avatarPublicId);

    return { message: 'Avatar removed successfully' };
  }

  /** ภาพรวมวิธีเข้าสู่ระบบทั้งหมดของบัญชี สำหรับหน้า Login & security */
  async getSecurityOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerifiedAt: true,
        password: true,
        googleId: true,
        isInstructor: true,
        twoFactorEnabled: true,
        emailVerificationTokens: {
          where: { usedAt: null, expiresAt: { gt: new Date() } },
          select: { pendingEmail: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      // ส่งแค่ว่ามีรหัสผ่านแล้วหรือยัง ไม่ส่ง hash ออกไปให้ฝั่งเว็บ
      hasPassword: user.password !== null,
      googleConnected: user.googleId !== null,
      isInstructor: user.isInstructor,
      twoFactorEnabled: user.twoFactorEnabled,
      pendingEmail: user.emailVerificationTokens[0]?.pendingEmail ?? null,
    };
  }

  // --- การยืนยันตัวตน 2 ขั้นตอน (รหัสทางอีเมล) ---

  /**
   * ขั้นแรกของการเปิด 2FA: ส่งรหัสไปที่อีเมลก่อน ใส่ถูกถึงจะเปิดได้
   * พิสูจน์ว่ายังเข้ากล่องเมลนั้นได้จริง ไม่งั้นเปิดแล้วอาจล็อกตัวเองออก
   * ต้องมีรหัสผ่านก่อน เพราะ 2FA ใช้กับการล็อกอินด้วยรหัสผ่านเท่านั้น
   */
  async requestEnableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, password: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-step verification is already on');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Set a password first. Two-step verification protects password logins.',
      );
    }

    const { id, code } = await this.oneTimeCodeService.issue(
      userId,
      OtpPurpose.ENABLE_TWO_FACTOR,
    );
    await this.mailService.sendOneTimeCode(
      user.email,
      code,
      OtpPurpose.ENABLE_TWO_FACTOR,
    );

    return {
      challengeId: id,
      message: `We sent a 6-digit code to ${user.email}`,
    };
  }

  async confirmEnableTwoFactor(
    userId: string,
    challengeId: string,
    code: string,
  ) {
    const codeOwnerId = await this.oneTimeCodeService.verify(
      challengeId,
      code,
      OtpPurpose.ENABLE_TWO_FACTOR,
    );

    // challengeId ของคนอื่นใช้แทนกันไม่ได้
    if (codeOwnerId !== userId) {
      throw new BadRequestException({
        message: 'This code has expired. Request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: 'Two-step verification is now on' };
  }

  /** ข้อมูลที่ต้องใช้ตรวจก่อนลบบัญชี ทั้งตอนขอรหัสและตอนลบจริง */
  private async findDeletableUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        password: true,
        role: true,
        avatarPublicId: true,
        avatarUrl: true,
        deletedAt: true,
      },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    // แอดมินลบตัวเองไม่ได้ กันระบบไม่มีคนดูแล ต้องให้ Super Admin จัดการ
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException(
        'Admin accounts can only be removed by a super admin',
      );
    }

    // ผู้สอนที่ยังมีคอร์สอยู่: ผู้เรียนที่ซื้อแล้วต้องเรียนต่อได้ ลบเองไม่ได้
    const activeCourses = await this.prisma.course.count({
      where: { instructorId: userId, status: { not: StatusCourse.DELETED } },
    });
    if (activeCourses > 0) {
      throw new ConflictException({
        message:
          'You still have courses. Delete or unpublish them first, or contact support to close an instructor account.',
        code: 'HAS_COURSES',
      });
    }

    return user;
  }

  /**
   * บัญชีที่ไม่มีรหัสผ่าน (เข้าทาง Google): ขอรหัส 6 หลักทางอีเมลก่อนลบ
   * ต้องพิมพ์อีเมลของบัญชีให้ตรงก่อน กันกดผิด และพิสูจน์ว่ายังเข้ากล่องเมลได้จริง
   */
  async requestDeleteAccountCode(userId: string, email: string) {
    const user = await this.findDeletableUser(userId);

    if (user.password) {
      throw new BadRequestException('Confirm with your password instead');
    }
    if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException(
        "That isn't the email address on your account",
      );
    }

    // กันกดส่งรหัสถี่ ๆ (สแปมกล่องเมล) เหมือนการส่งรหัสตอนล็อกอิน
    const pending = await this.prisma.oneTimeCode.findFirst({
      where: { userId, purpose: OtpPurpose.DELETE_ACCOUNT, usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (pending && this.oneTimeCodeService.isCoolingDown(pending.createdAt)) {
      throw new BadRequestException({
        message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code`,
        code: 'OTP_COOLDOWN',
      });
    }

    const { id, code } = await this.oneTimeCodeService.issue(
      userId,
      OtpPurpose.DELETE_ACCOUNT,
    );
    await this.mailService.sendOneTimeCode(
      user.email,
      code,
      OtpPurpose.DELETE_ACCOUNT,
    );

    return {
      challengeId: id,
      message: `We sent a 6-digit code to ${user.email}`,
    };
  }

  /**
   * ผู้ใช้ลบบัญชีตัวเอง (สิทธิ์ตาม PDPA)
   * ยืนยันด้วยรหัสผ่าน หรือรหัสทางอีเมลสำหรับบัญชีที่ไม่มีรหัสผ่าน
   *
   * ไม่ลบแถวทิ้ง เพราะประวัติการซื้อต้องเก็บตามกฎหมายบัญชี และคำสั่งซื้อผูกกับผู้ใช้อยู่
   * จึงลบ/แทนที่ข้อมูลที่ระบุตัวตนได้ทั้งหมด ลบตะกร้า wishlist ความคืบหน้าการเรียน
   * และตั้ง status = false ให้ token ที่ค้างอยู่ใช้ไม่ได้ทันที (AuthGuard เช็กทุกคำขอ)
   * อีเมลเดิมถูกแทนที่ จึงสมัครใหม่ด้วยอีเมลเดิมได้
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.findDeletableUser(userId);

    if (user.password) {
      if (
        !dto.password ||
        !(await this.bcryptService.compare(dto.password, user.password))
      ) {
        throw new UnauthorizedException('Password is incorrect');
      }
    } else {
      if (!dto.challengeId || !dto.code) {
        throw new BadRequestException(
          'Enter the 6-digit code we sent to your email',
        );
      }
      const codeOwnerId = await this.oneTimeCodeService.verify(
        dto.challengeId,
        dto.code,
        OtpPurpose.DELETE_ACCOUNT,
      );
      // challengeId ของคนอื่นใช้แทนกันไม่ได้
      if (codeOwnerId !== userId) {
        throw new BadRequestException({
          message: 'This code has expired. Request a new one.',
          code: 'OTP_EXPIRED',
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { studentId: userId } }),
      this.prisma.wishlist.deleteMany({ where: { studentId: userId } }),
      this.prisma.lessonProgress.deleteMany({
        where: { purchaseItem: { studentId: userId } },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.oneTimeCode.deleteMany({ where: { userId } }),
      // เลขบัญชีธนาคารสำหรับรับเงิน (ผู้สอน) เป็นข้อมูลส่วนตัว ลบทิ้งด้วย
      this.prisma.payoutAccount.deleteMany({ where: { instructorId: userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: 'Deleted',
          lastName: 'User',
          // โดเมน .invalid ส่งเมลไม่ได้แน่นอน (RFC 2606) และไม่ชนกับใคร
          email: `deleted-${userId}@deleted.invalid`,
          password: null,
          googleId: null,
          avatarUrl: null,
          avatarPublicId: null,
          bio: null,
          emailVerifiedAt: null,
          twoFactorEnabled: false,
          isInstructor: false,
          status: false,
          deletedAt: new Date(),
        },
      }),
    ]);

    // ลบรูปหลังบันทึกสำเร็จ ลบไม่ได้ก็ไม่เป็นไร (deleteAsset กลืน error เอง)
    await this.cloudinaryService.deleteAsset(
      user.avatarPublicId ??
        this.cloudinaryService.getPublicIdFromUrl(user.avatarUrl),
    );

    return { message: 'Your account has been deleted' };
  }

  /** ปิดต้องใส่รหัสผ่าน กันคนที่ยืมเครื่องที่ล็อกอินค้างไว้แอบปิด */
  async disableTwoFactor(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.password ||
      !(await this.bcryptService.compare(password, user.password))
    ) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    return { message: 'Two-step verification is now off' };
  }

  /**
   * ตั้งรหัสผ่านครั้งแรกสำหรับบัญชีที่สมัครผ่าน Google
   * (บัญชีที่มีรหัสอยู่แล้วต้องไปทาง changePassword ซึ่งบังคับใส่รหัสเดิม)
   */
  async setPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      throw new BadRequestException(
        'This account already has a password. Use change password instead.',
      );
    }

    await this.updatePassword(userId, newPassword);

    return { message: 'Password set successfully' };
  }

  /**
   * เชื่อมบัญชี Google เข้ากับบัญชีที่ล็อกอินอยู่ (จากหน้า settings)
   * id token มาจากปุ่ม Google บนหน้าเว็บโดยตรง ไม่ผ่าน NextAuth เพื่อไม่ให้
   * การเชื่อมบัญชีไปสลับ session ของคนที่ล็อกอินค้างอยู่
   */
  async connectGoogleWithIdToken(userId: string, idToken: string) {
    const profile = await this.googleAuthService.verify(idToken);
    return this.connectGoogle(userId, profile.googleId);
  }

  private async connectGoogle(userId: string, googleId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.googleId) {
      throw new ConflictException(
        'This account is already connected to Google',
      );
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { googleId },
      });
    } catch (error) {
      // googleId เป็น unique — ชน = บัญชี Google นี้ถูกผูกกับผู้ใช้คนอื่นแล้ว
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This Google account is already connected to another user',
        );
      }
      throw error;
    }

    return { message: 'Google account connected' };
  }

  /**
   * ยกเลิกการเชื่อม Google ได้ก็ต่อเมื่อยังเหลือวิธีเข้าสู่ระบบอีกทาง
   * ไม่งั้นบัญชีที่สมัครมาทาง Google ล้วนจะกดปุ่มนี้แล้วล็อกตัวเองออกถาวร
   */
  async disconnectGoogle(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleId: true, password: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.googleId) {
      throw new BadRequestException('This account is not connected to Google');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Set a password before disconnecting Google, otherwise you will not be able to log in.',
      );
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException(
        'Verify your email before disconnecting Google.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { googleId: null },
    });

    return { message: 'Google account disconnected' };
  }

  /**
   * ขอเปลี่ยนอีเมล — ยังไม่เปลี่ยนจริงจนกว่าเจ้าของอีเมลใหม่จะกดลิงก์ยืนยัน
   * (AuthService.verifyEmail เป็นคนเขียนค่าใหม่ลงไป) ระหว่างนี้อีเมลเดิม
   * ยังใช้ล็อกอินได้ตามปกติ
   */
  async requestEmailChange(userId: string, newEmail: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // บังคับยืนยันตัวตนด้วยรหัสผ่านเสมอ กันคนที่ยืมเครื่องที่ล็อกอินค้างไว้
    // เปลี่ยนอีเมลแล้วยึดบัญชีไปทั้งใบ
    if (!user.password) {
      throw new BadRequestException(
        'Set a password before changing your email address.',
      );
    }

    const isMatch = await this.bcryptService.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Password is incorrect');
    }

    const email = newEmail.toLowerCase();

    if (email === user.email.toLowerCase()) {
      throw new BadRequestException(
        'This is already your current email address',
      );
    }

    const taken = await this.findByEmail(email);

    if (taken) {
      throw new ConflictException('That email is already in use');
    }

    return { email };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const { email } = await this.requestEmailChange(
      userId,
      dto.newEmail,
      dto.password,
    );

    const token = await this.emailVerificationTokenService.issue(userId, email);

    try {
      await this.mailService.sendEmailChangeVerification(email, token);
    } catch (error) {
      // ส่งเมลไม่ออก = ผู้ใช้ไม่มีทางกดยืนยันได้ ถ้าปล่อยแถวค้างไว้ หน้า
      // settings จะขึ้นว่า "รอยืนยันที่ ..." ทั้งที่ไม่เคยมีเมลไปถึงเลย
      await this.emailVerificationTokenService.discardPending(userId);
      throw error;
    }

    return {
      message: 'Check your new inbox for the confirmation link',
      pendingEmail: email,
    };
  }

  /** เรียกหลังผู้ใช้กดลิงก์ยืนยันอีเมลใหม่แล้วเท่านั้น */
  applyEmailChange(userId: string, newEmail: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerifiedAt: new Date() },
      omit: { password: true, avatarPublicId: true },
    });
  }

  /**
   * เปิดสิทธิ์สอนให้ตัวเอง — ผู้เรียนทุกคนกดเป็นผู้สอนได้เลยแบบ Udemy
   *
   * คืน access token ใบใหม่มาด้วย เพราะ InstructorGuard อ่านสิทธิ์จาก payload
   * ใน token ไม่ได้ถามฐานข้อมูลทุกครั้ง ถ้าไม่เปลี่ยน token ให้ ผู้ใช้จะยัง
   * โดนปฏิเสธจากทุก endpoint ฝั่งสอนจนกว่าจะล็อกอินใหม่
   */
  async becomeInstructor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, isInstructor: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isInstructor) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isInstructor: true },
      });
    }

    const access_token = await this.accessTokenService.sign({
      sub: userId,
      email: user.email,
      role: user.role,
      isInstructor: true,
    });

    return {
      message: user.isInstructor
        ? 'You are already an instructor'
        : 'Instructor access enabled',
      access_token,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Your account uses Google sign-in. Use forgot password to set a password first.',
      );
    }

    const isMatch = await this.bcryptService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.updatePassword(userId, dto.newPassword);

    return { message: 'Password changed successfully' };
  }
}
