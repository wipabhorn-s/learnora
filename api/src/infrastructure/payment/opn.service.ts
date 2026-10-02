import { EnvVariable } from '@/config/env.validation';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const OPN_API_URL = 'https://api.omise.co';

/** ส่วนของ charge object จาก Opn ที่ระบบนี้ใช้ */
export type OpnCharge = {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'expired' | 'reversed';
  paid: boolean;
  /** ยอดที่คืนไปแล้ว (สตางค์) */
  refunded_amount: number;
  /** false = ช่องทางนี้คืนเงินผ่าน API ไม่ได้ (เช่นพร้อมเพย์) */
  refundable: boolean;
  authorize_uri: string | null;
  failure_code: string | null;
  failure_message: string | null;
  expires_at: string | null;
  metadata: Record<string, string>;
  source: {
    type: string;
    scannable_code?: { image?: { download_uri?: string } } | null;
  } | null;
};

export type OpnChargeInput = {
  /** หน่วยสตางค์ */
  amount: number;
  returnUri: string;
  metadata: Record<string, string>;
  description: string;
  /** โทเค็นบัตรจาก Omise.js (tokn_...) */
  cardToken?: string;
  source?: { type: string; phone_number?: string };
  expiresAt?: Date;
};

type OpnError = { object: 'error'; code: string; message: string };

/**
 * เรียก REST API ของ Opn Payments (ชื่อเดิม Omise) ตรง ๆ ด้วย fetch
 * ไม่ใช้ SDK เพราะใช้แค่ 3 endpoint และ SDK ทางการไม่มี type ให้
 *
 * Opn รับ body แบบ form-encoded (source[type]=promptpay) ตามตัวอย่างในเอกสาร
 */
@Injectable()
export class OpnService {
  private readonly logger = new Logger(OpnService.name);
  private readonly authHeader: string;
  private readonly webhookSecret?: Buffer;

  constructor(configService: ConfigService<EnvVariable, true>) {
    // Basic auth: secret key เป็น username รหัสผ่านว่าง
    const secretKey = configService.get('OMISE_SECRET_KEY', { infer: true });
    this.authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const webhookSecret = configService.get('OMISE_WEBHOOK_SECRET', {
      infer: true,
    });
    // secret ในหน้า Webhooks ของ Opn เข้ารหัส base64 ไว้ ต้องถอดก่อนใช้
    this.webhookSecret = webhookSecret
      ? Buffer.from(webhookSecret, 'base64')
      : undefined;

    // production ต้องตรวจลายเซ็นเสมอ (ถึงจะถาม Opn ซ้ำอยู่แล้วก็ตาม) เตือนให้เห็นใน log
    if (!this.webhookSecret && process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'OMISE_WEBHOOK_SECRET is not set — webhook signatures are NOT verified',
      );
    }
  }

  createCharge(input: OpnChargeInput) {
    const body = new URLSearchParams({
      amount: String(input.amount),
      currency: 'thb',
      return_uri: input.returnUri,
      description: input.description,
    });

    for (const [key, value] of Object.entries(input.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
    if (input.cardToken) body.set('card', input.cardToken);
    if (input.source) {
      for (const [key, value] of Object.entries(input.source)) {
        if (value) body.set(`source[${key}]`, value);
      }
    }
    if (input.expiresAt) body.set('expires_at', input.expiresAt.toISOString());

    return this.request<OpnCharge>('POST', '/charges', body);
  }

  getCharge(chargeId: string) {
    return this.request<OpnCharge>(
      'GET',
      `/charges/${encodeURIComponent(chargeId)}`,
    );
  }

  refund(chargeId: string, amount: number) {
    return this.request<{ id: string; status: string }>(
      'POST',
      `/charges/${encodeURIComponent(chargeId)}/refunds`,
      new URLSearchParams({ amount: String(amount) }),
    );
  }

  /**
   * ตรวจว่า webhook มาจาก Opn จริง: HMAC-SHA256 ของ "<timestamp>.<raw body>"
   * header อาจมีหลายลายเซ็นคั่นด้วยคอมมา (ช่วงเปลี่ยน secret) ตรงอันใดอันหนึ่งก็ผ่าน
   * ไม่ได้ตั้ง secret ไว้ = ข้ามการตรวจ แต่ผู้เรียกยังต้องถามสถานะจาก Opn เองเสมอ
   */
  verifyWebhook(
    rawBody: Buffer,
    signature?: string,
    timestamp?: string,
  ): boolean {
    if (!this.webhookSecret) return true;
    if (!signature || !timestamp) return false;

    // กันการเอา webhook เก่ามายิงซ้ำ: รับเฉพาะที่เซ็นภายใน 5 นาที
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 5 * 60) return false;

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest();

    return signature.split(',').some((candidate) => {
      const received = Buffer.from(candidate.trim(), 'hex');
      return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      );
    });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: URLSearchParams,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${OPN_API_URL}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          ...(body && {
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        },
        body,
      });
    } catch (error) {
      this.logger.error('Cannot reach Opn Payments', error);
      throw new ServiceUnavailableException(
        'Payment provider is unavailable. Please try again.',
      );
    }

    const data = (await response.json()) as T | OpnError;

    if (!response.ok) {
      const error = data as OpnError;
      this.logger.warn(
        `Opn ${method} ${path} → ${error.code}: ${error.message}`,
      );
      // 4xx = ข้อมูลที่ส่งไปใช้ไม่ได้ (บัตรถูกปฏิเสธ เบอร์ผิด ฯลฯ) บอกผู้ใช้ได้
      if (response.status < 500) {
        throw new BadRequestException({
          message: error.message,
          code: `OPN_${error.code?.toUpperCase() ?? 'ERROR'}`,
        });
      }
      throw new ServiceUnavailableException(
        'Payment provider is unavailable. Please try again.',
      );
    }

    return data as T;
  }
}
