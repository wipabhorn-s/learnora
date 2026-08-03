// api\src\auth\google-auth.service.ts

import { EnvVariable } from '@/config/env.validation';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export type GoogleProfile = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID', {
      infer: true,
    });
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name ?? 'User',
      lastName: payload.family_name ?? '-',
    };
  }
}
