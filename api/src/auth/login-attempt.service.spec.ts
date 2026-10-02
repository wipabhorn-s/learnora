import {
  LoginAttemptService,
  MAX_FAILED_LOGINS,
} from '@/auth/login-attempt.service';
import { HttpException } from '@nestjs/common';

const MINUTE = 60_000;

describe('LoginAttemptService', () => {
  const email = 'ann@test.local';

  function failTimes(service: LoginAttemptService, times: number, at = 0) {
    for (let i = 0; i < times; i++) service.recordFailure(email, at);
  }

  it('allows attempts below the limit', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS - 1);

    expect(() => service.assertNotLocked(email, 0)).not.toThrow();
  });

  it('locks the email after too many failures, with a 429 and wait time', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS);

    let error: unknown;
    try {
      service.assertNotLocked(email, MINUTE);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
      message: expect.stringContaining('14 minutes') as unknown,
    });
  });

  it('treats the email case-insensitively', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS);

    expect(() => service.assertNotLocked(' ANN@test.local ', 0)).toThrow();
  });

  it('unlocks after 15 minutes', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS);

    expect(() => service.assertNotLocked(email, 15 * MINUTE)).not.toThrow();
  });

  it('starts counting again when old failures are outside the window', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS - 1, 0);
    service.recordFailure(email, 16 * MINUTE);

    expect(() => service.assertNotLocked(email, 16 * MINUTE)).not.toThrow();
  });

  it('clears the history after a successful login', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS - 1);
    service.reset(email);
    service.recordFailure(email, 0);

    expect(() => service.assertNotLocked(email, 0)).not.toThrow();
  });

  it('does not affect other accounts', () => {
    const service = new LoginAttemptService();
    failTimes(service, MAX_FAILED_LOGINS);

    expect(() => service.assertNotLocked('bob@test.local', 0)).not.toThrow();
  });
});
