import { AuthService } from '@/auth/auth.service';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

/** AuthService ที่ทุก dependency เป็น mock (ใช้แค่ส่วนที่ register / login แตะ) */
function setup() {
  const userService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
  };
  const bcryptService = {
    hash: jest.fn(() => Promise.resolve('$2b$12$dummy')),
    compare: jest.fn(() => Promise.resolve(false)),
  };
  const emailVerificationTokenService = {
    issue: jest.fn(() => Promise.resolve('verify-token')),
    lastIssuedAt: jest.fn(() => Promise.resolve(null)),
  };
  const mailService = {
    sendEmailVerification: jest.fn(() => Promise.resolve()),
    sendAccountExistsNotice: jest.fn(() => Promise.resolve()),
  };
  const loginAttemptService = {
    assertNotLocked: jest.fn(() => Promise.resolve()),
    recordFailure: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
  };

  const service = new AuthService(
    userService as never,
    bcryptService as never,
    {} as never,
    {} as never,
    emailVerificationTokenService as never,
    {} as never,
    mailService as never,
    {} as never,
    loginAttemptService as never,
    {} as never,
  );

  return {
    service,
    userService,
    bcryptService,
    emailVerificationTokenService,
    mailService,
    loginAttemptService,
  };
}

const registerDto = {
  firstName: 'Ann',
  lastName: 'Lee',
  email: 'ann@example.test',
  password: 'Learnora1!',
  acceptTerms: true,
} as RegisterDto;

describe('AuthService.register — no email enumeration', () => {
  it('sends a verification link for a new account', async () => {
    const t = setup();
    t.userService.createUser.mockResolvedValue({
      id: 'u1',
      email: 'ann@example.test',
    });

    await expect(t.service.register(registerDto)).resolves.toBeUndefined();
    expect(t.mailService.sendEmailVerification).toHaveBeenCalledWith(
      'ann@example.test',
      'verify-token',
    );
  });

  it('answers like a new signup when the email is taken, and tells the owner', async () => {
    const t = setup();
    t.userService.createUser.mockRejectedValue(
      new ConflictException('Email already registered'),
    );
    t.userService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'ann@example.test',
      emailVerifiedAt: new Date(),
    });

    await expect(t.service.register(registerDto)).resolves.toBeUndefined();
    expect(t.mailService.sendAccountExistsNotice).toHaveBeenCalledWith(
      'ann@example.test',
    );
    expect(t.mailService.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('resends the verification link when the existing account is unverified', async () => {
    const t = setup();
    t.userService.createUser.mockRejectedValue(new ConflictException());
    t.userService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'ann@example.test',
      emailVerifiedAt: null,
    });

    await expect(t.service.register(registerDto)).resolves.toBeUndefined();
    expect(t.mailService.sendEmailVerification).toHaveBeenCalledWith(
      'ann@example.test',
      'verify-token',
    );
    expect(t.mailService.sendAccountExistsNotice).not.toHaveBeenCalled();
  });
});

describe('AuthService.login — no email enumeration', () => {
  const login = (service: AuthService) =>
    service.login({ email: 'ann@example.test', password: 'wrong' }, '1.2.3.4');

  it.each([
    ['no account', null],
    [
      'a Google-only account',
      { id: 'u1', email: 'ann@example.test', password: null },
    ],
    [
      'a wrong password',
      { id: 'u1', email: 'ann@example.test', password: '$2b$12$real' },
    ],
  ])(
    'gives the same answer and still runs bcrypt for %s',
    async (_case, user) => {
      const t = setup();
      t.userService.findByEmail.mockResolvedValue(user);

      const error = await login(t.service).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        message: 'Invalid email or password',
      });
      expect(t.bcryptService.compare).toHaveBeenCalledTimes(1);
      expect(t.loginAttemptService.recordFailure).toHaveBeenCalled();
    },
  );
});
