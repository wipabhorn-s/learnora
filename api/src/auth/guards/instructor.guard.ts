// api\src\auth\guards\instructor.guard.ts

import { IS_INSTRUCTOR_KEY } from '@/common/decorator/instructor.decorator';
import { IS_PUBLIC_KEY } from '@/common/decorator/public.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class InstructorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiresInstructor = this.reflector.getAllAndOverride<boolean>(
      IS_INSTRUCTOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresInstructor) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user?.isInstructor) {
      throw new ForbiddenException('Instructor access required');
    }

    return true;
  }
}
