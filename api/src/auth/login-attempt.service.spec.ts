import {
  LoginAttemptService,
  MAX_FAILED_LOGINS,
  MAX_FAILED_LOGINS_PER_ACCOUNT,
} from '@/auth/login-attempt.service';
import { HttpException } from '@nestjs/common';

const MINUTE = 60_000;
const at = (minutes: number) => new Date(minutes * MINUTE);

type Row = {
  key: string;
  count: number;
  firstAt: Date;
  lockedUntil: Date | null;
};

/** ตาราง login_attempts จำลองในหน่วยความจำ */
function setup() {
  const rows = new Map<string, Row>();
  const prisma = {
    loginAttempt: {
      findUnique: jest.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(rows.get(where.key) ?? null),
      ),
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { key: { in: string[] }; lockedUntil: { gt: Date } };
        }) =>
          Promise.resolve(
            where.key.in
              .map((key) => rows.get(key))
              .filter(
                (row): row is Row =>
                  !!row?.lockedUntil && row.lockedUntil > where.lockedUntil.gt,
              ),
          ),
      ),
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: { key: string };
          create: Row;
          update: Partial<Row>;
        }) => {
          const existing = rows.get(where.key);
          rows.set(where.key, existing ? { ...existing, ...update } : create);
          return Promise.resolve(rows.get(where.key));
        },
      ),
      deleteMany: jest.fn(
        ({ where }: { where: { key?: { in: string[] } } }) => {
          // ทดสอบแค่การล้างตาม key ส่วนการเก็บกวาดแถวหมดอายุไม่กระทบผลการนับ
          where.key?.in.forEach((key) => rows.delete(key));
          return Promise.resolve({ count: 0 });
        },
      ),
    },
  };
  return new LoginAttemptService(prisma as never);
}

const email = 'ann@test.local';
const myIp = '203.0.113.10';
const attackerIp = '198.51.100.66';

async function fail(
  service: LoginAttemptService,
  times: number,
  ip = myIp,
  when = at(0),
) {
  for (let i = 0; i < times; i++) await service.recordFailure(email, ip, when);
}

async function lockError(promise: Promise<void>) {
  try {
    await promise;
  } catch (error) {
    return error as HttpException;
  }
  return null;
}

describe('LoginAttemptService', () => {
  it('allows attempts below the limit', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS - 1);

    await expect(
      service.assertNotLocked(email, myIp, at(0)),
    ).resolves.toBeUndefined();
  });

  it('locks that device after too many failures, with a 429 and wait time', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS);

    const error = await lockError(service.assertNotLocked(email, myIp, at(1)));
    expect(error).toBeInstanceOf(HttpException);
    expect(error!.getStatus()).toBe(429);
    expect(error!.getResponse()).toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
      message: expect.stringContaining('14 minutes') as unknown,
    });
  });

  it('an attacker on another IP cannot lock the real owner out', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS, attackerIp);

    await expect(
      service.assertNotLocked(email, attackerIp, at(1)),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.assertNotLocked(email, myIp, at(1)),
    ).resolves.toBeUndefined();
  });

  it('locks the whole account when guesses come from many IPs', async () => {
    const service = setup();
    for (let i = 0; i < MAX_FAILED_LOGINS_PER_ACCOUNT; i++) {
      await service.recordFailure(email, `10.0.0.${i}`, at(0));
    }

    await expect(
      service.assertNotLocked(email, myIp, at(1)),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('treats the email case-insensitively', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS);

    await expect(
      service.assertNotLocked(' ANN@test.local ', myIp, at(0)),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('unlocks after 15 minutes', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS);

    await expect(
      service.assertNotLocked(email, myIp, at(15)),
    ).resolves.toBeUndefined();
  });

  it('starts counting again when old failures are outside the window', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS - 1, myIp, at(0));
    await service.recordFailure(email, myIp, at(16));

    await expect(
      service.assertNotLocked(email, myIp, at(16)),
    ).resolves.toBeUndefined();
  });

  it('clears the history after a successful login', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS - 1);
    await service.reset(email, myIp);
    await service.recordFailure(email, myIp, at(0));

    await expect(
      service.assertNotLocked(email, myIp, at(0)),
    ).resolves.toBeUndefined();
  });

  it('does not affect other accounts', async () => {
    const service = setup();
    await fail(service, MAX_FAILED_LOGINS);

    await expect(
      service.assertNotLocked('bob@test.local', myIp, at(0)),
    ).resolves.toBeUndefined();
  });
});
