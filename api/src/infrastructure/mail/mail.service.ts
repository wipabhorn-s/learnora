// api\src\infrastructure\mail\mail.service.ts

import { EnvVariable } from '@/config/env.validation';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Brevo transactional email API — HTTPS ล้วน ไม่ใช่ SMTP */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const SEND_TIMEOUT_MS = 10_000;

/**
 * ใช้ HTTP API ของ Brevo แทน SMTP เพราะผู้ให้บริการโฮสต์ส่วนใหญ่ (Railway,
 * Render, Vercel) ปิด outbound SMTP port 25/465/587 ไว้ nodemailer จึงต่อ
 * smtp.gmail.com ไม่ติดบน production แล้วเมลไม่เคยถูกส่งออกเลยโดยไม่มี error
 *
 * BREVO_API_KEY เป็น optional: คนที่ไม่ได้ทำงานกับเมลไม่ต้องหา key มาใส่ก็
 * boot ขึ้น แต่ถ้ามีการส่งจริงโดยไม่ได้ตั้งค่าจะได้ 503 พร้อมบอกว่าขาด env
 * ตัวไหน แทนที่จะล้มตอน boot หรือเงียบหายไปเฉย ๆ
 */
@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  private get frontendUrl(): string {
    return this.configService
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');
  }

  /**
   * Brevo ต้องการอีเมลผู้ส่งเป็นค่าเปล่า ๆ ในฟิลด์ของมันเอง แต่ MAIL_FROM
   * อาจถูกตั้งในรูป `ชื่อ <a@b.com>` ตามธรรมเนียมของ SMTP จึงต้องแยกออกจากกัน
   * ก่อนส่ง ไม่งั้น Brevo ตอบ 400 ว่าอีเมลไม่ถูกต้อง
   */
  private get sender(): { email: string; name: string } {
    const raw = this.configService.get('MAIL_FROM', { infer: true }).trim();
    const configuredName = this.configService.get('MAIL_FROM_NAME', {
      infer: true,
    });

    const angled = /^(.*)<\s*([^>]+)\s*>$/.exec(raw);
    const email = angled ? angled[2].trim() : raw;
    const name =
      configuredName ?? angled?.[1].trim().replace(/^"|"$/g, '') ?? 'Learnora';

    return { email, name: name || 'Learnora' };
  }

  private link(path: string, token: string): string {
    return `${this.frontendUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private layout(heading: string, body: string): string {
    return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
  ${body}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="font-size:12px;color:#64748b;margin:0">Learnora</p>
</div>`;
  }

  private button(url: string, label: string): string {
    // ลิงก์ตัวหนังสือต่อท้ายด้วยเสมอ เพราะ mail client บางตัวตัดปุ่มที่เป็น
    // background-color ทิ้ง แล้วผู้รับจะเหลือเมลที่กดอะไรไม่ได้เลย
    return `<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">${label}</a></p>
  <p style="font-size:12px;color:#64748b;margin:0 0 16px">หรือคัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์<br /><a href="${url}" style="color:#4f46e5;word-break:break-all">${url}</a></p>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = this.configService.get('BREVO_API_KEY', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'ยังไม่ได้ตั้งค่า BREVO_API_KEY จึงส่งอีเมลไม่ได้',
      );
    }

    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: this.sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // เนื้อ error ของ Brevo บอกสาเหตุตรง ๆ (key ผิด, sender ยังไม่ verify,
      // โควตาวันนี้เต็ม) จึงพาไปด้วยเพื่อไม่ต้องเดาจาก status code เปล่า ๆ
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Brevo ตอบกลับ ${response.status}: ${detail.slice(0, 500)}`,
      );
    }
  }

  async sendEmailVerification(to: string, token: string) {
    const url = this.link('/verify-email', token);

    await this.send(
      to,
      'ยืนยันอีเมลของคุณ — Learnora',
      this.layout(
        'ยืนยันอีเมลของคุณ',
        `<p style="margin:0 0 16px">ขอบคุณที่สมัครใช้งาน Learnora กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มใช้งาน</p>
  ${this.button(url, 'ยืนยันอีเมล')}
  <p style="font-size:13px;color:#64748b;margin:0">หากคุณไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>`,
      ),
    );
  }

  async sendEmailChangeVerification(to: string, token: string) {
    const url = this.link('/verify-email', token);

    await this.send(
      to,
      'ยืนยันอีเมลใหม่ — Learnora',
      this.layout(
        'ยืนยันอีเมลใหม่',
        `<p style="margin:0 0 16px">มีคำขอเปลี่ยนอีเมลของบัญชี Learnora มาเป็นอีเมลนี้ กดปุ่มด้านล่างเพื่อยืนยัน</p>
  ${this.button(url, 'ยืนยันอีเมลใหม่')}
  <p style="font-size:13px;color:#64748b;margin:0">หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ อีเมลเดิมจะยังใช้งานได้ตามปกติ</p>`,
      ),
    );
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = this.link('/reset-password', token);

    await this.send(
      to,
      'ตั้งรหัสผ่านใหม่ — Learnora',
      this.layout(
        'ตั้งรหัสผ่านใหม่',
        `<p style="margin:0 0 16px">มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>
  ${this.button(url, 'ตั้งรหัสผ่านใหม่')}
  <p style="font-size:13px;color:#64748b;margin:0">ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุในไม่ช้า หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>`,
      ),
    );
  }
}
