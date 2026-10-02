// api\src\auth\guards\auth.guard.ts

import { AccessTokenService } from '@/auth/access-token.service';
import { IS_PUBLIC_KEY } from '@/common/decorator/public.decorator';
import { PrismaService } from '@/database/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const [bearer, token] = request.headers.authorization?.split(' ') ?? [];
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    try {
      request.user = await this.accessTokenService.verify(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }

    // token ยังไม่หมดอายุไม่ได้แปลว่าบัญชียังใช้ได้: ถ้าบัญชีถูกลบหรือโดนระงับ
    // ระหว่างที่ล็อกอินค้างอยู่ ตอบ 401 ให้เว็บรู้ว่าต้องล็อกเอาต์
    // ไม่งั้นแต่ละ endpoint จะตอบ 404 "User not found" กระจัดกระจายไปหมด
    const account = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { status: true },
    });

    if (!account?.status) {
      throw new UnauthorizedException({
        message: 'Your session is no longer valid. Please log in again.',
        code: 'SESSION_INVALID',
      });
    }

    return true;
  }
}
