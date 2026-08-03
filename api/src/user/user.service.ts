// api\src\user\user.service.ts

import { GoogleProfile } from '@/auth/google-auth.service';
import { Role } from '@/database/generated/prisma/enums';
import { PrismaService } from '@/database/prisma.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { ChangePasswordDto } from '@/user/dto/change-password.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserCreateInput } from '@/user/types/user.type';
import {
  BadRequestException,
  ConflictException,
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
  ) {}

  async createUser(input: UserCreateInput) {
    const hash = await this.bcryptService.hash(input.password);
    try {
      await this.prisma.user.create({ data: { ...input, password: hash } });
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

  createGoogleUser(input: GoogleProfile) {
    return this.prisma.user.create({
      data: { ...input, role: Role.STUDENT },
      omit: { avatarPublicId: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
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
