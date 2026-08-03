// api\src\auth\reset-token.service.ts

import { ResetTokenPayload } from '@/auth/types/jwt-payload';
import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ResetTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  sign(payload: ResetTokenPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('RESET_TOKEN_SECRET', { infer: true }),
      expiresIn: this.configService.get('RESET_TOKEN_EXPIRES_IN', {
        infer: true,
      }),
    });
  }

  verify(token: string): Promise<ResetTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('RESET_TOKEN_SECRET', { infer: true }),
    });
  }
}
