import { validate } from '@/config/env.validation';
import { Logger } from '@nestjs/common';

const baseEnv = {
  PORT: '8000',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/learnora',
  ACCESS_TOKEN_SECRET: 'x'.repeat(32),
  ACCESS_TOKEN_EXPIRES_IN: '900',
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: '86400',
  MAIL_FROM: 'no-reply@example.test',
  MAIL_FROM_NAME: 'Learnora',
  BREVO_API_KEY: 'brevo',
  RESET_TOKEN_EXPIRES_IN: '600',
  GOOGLE_CLIENT_ID: 'google',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  PAYOUT_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

describe('env validation: OMISE_WEBHOOK_SECRET', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is optional with a test key', () => {
    expect(() =>
      validate({ ...baseEnv, OMISE_SECRET_KEY: 'skey_test_abc' }),
    ).not.toThrow();
  });

  it('is required with a live key', () => {
    expect(() =>
      validate({ ...baseEnv, OMISE_SECRET_KEY: 'skey_live_abc' }),
    ).toThrow('Env validation failed');
    expect(() =>
      validate({
        ...baseEnv,
        OMISE_SECRET_KEY: 'skey_live_abc',
        OMISE_WEBHOOK_SECRET: '  ',
      }),
    ).toThrow('Env validation failed');
  });

  it('accepts a live key together with a webhook secret', () => {
    expect(() =>
      validate({
        ...baseEnv,
        OMISE_SECRET_KEY: 'skey_live_abc',
        OMISE_WEBHOOK_SECRET: 'whsec',
      }),
    ).not.toThrow();
  });
});
