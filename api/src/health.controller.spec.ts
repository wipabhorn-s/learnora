import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let queryRaw: jest.Mock;
  let controller: HealthController;

  beforeEach(() => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    controller = new HealthController({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
  });

  it('GET /health answers without touching the database (lets Neon suspend)', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('GET /health/db answers ok when the database responds', async () => {
    await expect(controller.checkDatabase()).resolves.toEqual({
      status: 'ok',
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('GET /health/db answers 503 when the database is unreachable', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(controller.checkDatabase()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
