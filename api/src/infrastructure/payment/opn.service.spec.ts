import { OpnService } from '@/infrastructure/payment/opn.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

const SECRET = Buffer.from('test-webhook-secret');

function makeService(webhookSecret?: string) {
  const env: Record<string, string | undefined> = {
    OMISE_SECRET_KEY: 'skey_test_123',
    OMISE_WEBHOOK_SECRET: webhookSecret,
  };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new OpnService(config as never);
}

function sign(body: Buffer, timestamp: string, secret = SECRET) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest('hex');
}

describe('OpnService.verifyWebhook', () => {
  const body = Buffer.from('{"key":"charge.complete","data":{"id":"chrg_1"}}');
  const now = () => String(Math.floor(Date.now() / 1000));
  const service = makeService(SECRET.toString('base64'));

  it('accepts a correctly signed, fresh webhook', () => {
    const timestamp = now();
    expect(service.verifyWebhook(body, sign(body, timestamp), timestamp)).toBe(
      true,
    );
  });

  it('rejects a signature made with another secret', () => {
    const timestamp = now();
    const forged = sign(body, timestamp, Buffer.from('attacker'));
    expect(service.verifyWebhook(body, forged, timestamp)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const timestamp = now();
    const signature = sign(body, timestamp);
    const tampered = Buffer.from(body.toString().replace('chrg_1', 'chrg_2'));
    expect(service.verifyWebhook(tampered, signature, timestamp)).toBe(false);
  });

  it('rejects a replayed webhook older than 5 minutes', () => {
    const old = String(Math.floor(Date.now() / 1000) - 6 * 60);
    expect(service.verifyWebhook(body, sign(body, old), old)).toBe(false);
  });

  it('rejects missing headers', () => {
    expect(service.verifyWebhook(body, undefined, now())).toBe(false);
    expect(service.verifyWebhook(body, 'abc', undefined)).toBe(false);
  });

  it('accepts any one of several comma-separated signatures (secret rotation)', () => {
    const timestamp = now();
    const header = `${'00'.repeat(32)}, ${sign(body, timestamp)}`;
    expect(service.verifyWebhook(body, header, timestamp)).toBe(true);
  });

  it('skips verification when no secret is configured', () => {
    expect(makeService().verifyWebhook(body, undefined, undefined)).toBe(true);
  });
});
