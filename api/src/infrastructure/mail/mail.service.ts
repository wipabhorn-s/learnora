// api\src\infrastructure\mail\mail.service.ts

import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Brevo transactional email API — HTTPS ล้วน ไม่ใช่ SMTP */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const SEND_TIMEOUT_MS = 10_000;

/** ข้อความที่ผู้ใช้/แอดมินพิมพ์เอง ต้อง escape ก่อนใส่ใน HTML ของอีเมล */
const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/**
 * ใช้ HTTP API ของ Brevo แทน SMTP เพราะผู้ให้บริการโฮสต์ส่วนใหญ่ (Railway,
 * Render, Vercel) ปิด outbound SMTP port 25/465/587 ไว้ nodemailer จึงต่อ
 * smtp.gmail.com ไม่ติดบน production แล้วเมลไม่เคยถูกส่งออกเลยโดยไม่มี error
 *
 * ค่า BREVO_API_KEY / MAIL_FROM / MAIL_FROM_NAME ถูกบังคับให้มีค่าตั้งแต่
 * ตอน boot แล้วใน env.validation.ts ที่นี่จึงใช้ได้เลยโดยไม่ต้องเช็กซ้ำ
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
    const angled = /^(.*)<\s*([^>]+)\s*>$/.exec(raw);

    return {
      email: angled ? angled[2].trim() : raw,
      name: this.configService.get('MAIL_FROM_NAME', { infer: true }),
    };
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
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.configService.get('BREVO_API_KEY', { infer: true }),
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

  /**
   * มีคนสมัครด้วยอีเมลที่เป็นสมาชิกอยู่แล้ว หน้าสมัครไม่บอกเรื่องนี้ (กันไล่เช็กอีเมล)
   * จึงแจ้งเจ้าของทางอีเมลแทน พร้อมทางไปต่อ: ล็อกอิน หรือรีเซ็ตรหัสผ่าน
   */
  async sendAccountExistsNotice(to: string) {
    const loginUrl = `${this.frontendUrl}/login`;
    const forgotUrl = `${this.frontendUrl}/forgot-password`;

    await this.send(
      to,
      'คุณมีบัญชี Learnora อยู่แล้ว',
      this.layout(
        'คุณมีบัญชีอยู่แล้ว',
        `<p style="margin:0 0 16px">มีการสมัครสมาชิก Learnora ด้วยอีเมลนี้ แต่อีเมลนี้มีบัญชีอยู่แล้ว เข้าสู่ระบบได้เลย (ถ้าเคยสมัครด้วย Google ให้กด Continue with Google)</p>
  ${this.button(loginUrl, 'เข้าสู่ระบบ')}
  <p style="font-size:13px;color:#64748b;margin:0">จำรหัสผ่านไม่ได้? <a href="${forgotUrl}" style="color:#4f46e5">ตั้งรหัสผ่านใหม่</a> · หากคุณไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยต่ออีเมลฉบับนี้ บัญชีของคุณยังปลอดภัย</p>`,
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

  /** รหัส 6 หลัก: ล็อกอิน (2FA), เปิดใช้ 2FA และยืนยันการลบบัญชี */
  async sendOneTimeCode(
    to: string,
    code: string,
    purpose: 'LOGIN' | 'ENABLE_TWO_FACTOR' | 'DELETE_ACCOUNT',
  ) {
    if (purpose === 'DELETE_ACCOUNT') {
      await this.send(
        to,
        `${code} คือรหัสยืนยันการลบบัญชี — Learnora`,
        this.layout(
          'รหัสยืนยันการลบบัญชี',
          `<p style="margin:0 0 16px">มีคำขอลบบัญชี Learnora ของคุณ ใส่รหัสนี้ในหน้า Login &amp; Security เพื่อยืนยัน การลบบัญชีย้อนกลับไม่ได้</p>
  <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#dc2626">${code}</p>
  <p style="font-size:13px;color:#64748b;margin:0">รหัสนี้ใช้ได้ครั้งเดียวและหมดอายุใน 10 นาที หากคุณไม่ได้เป็นผู้ขอ อย่าบอกรหัสนี้กับใคร และบัญชีของคุณจะยังอยู่ตามปกติ</p>`,
        ),
      );
      return;
    }

    const isLogin = purpose === 'LOGIN';
    const heading = isLogin
      ? 'รหัสยืนยันการเข้าสู่ระบบ'
      : 'รหัสยืนยันการเปิดใช้งาน 2 ขั้นตอน';

    await this.send(
      to,
      `${code} คือรหัสยืนยันของคุณ — Learnora`,
      this.layout(
        heading,
        `<p style="margin:0 0 16px">${
          isLogin
            ? 'มีการเข้าสู่ระบบบัญชี Learnora ของคุณด้วยรหัสผ่าน ใส่รหัสนี้เพื่อยืนยันว่าเป็นคุณ'
            : 'ใส่รหัสนี้ในหน้า Login &amp; Security เพื่อเปิดใช้การยืนยันตัวตน 2 ขั้นตอน'
        }</p>
  <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5">${code}</p>
  <p style="font-size:13px;color:#64748b;margin:0">รหัสนี้ใช้ได้ครั้งเดียวและหมดอายุใน 10 นาที อย่าบอกรหัสนี้กับใคร${
    isLogin
      ? ' หากคุณไม่ได้เป็นคนเข้าสู่ระบบ แปลว่ามีคนรู้รหัสผ่านของคุณ ควรเปลี่ยนรหัสผ่านทันที'
      : ''
  }</p>`,
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

  /** แจ้งผลคำขอคืนเงินให้นักเรียน */
  async sendRefundDecision(
    to: string,
    decision: {
      approved: boolean;
      amount: string;
      courseTitles: string[];
      /** คืนเงินเองนอกระบบ (เช่นพร้อมเพย์) แอดมินโอนให้แล้ว */
      manual?: boolean;
      note?: string | null;
    },
  ) {
    const courses = decision.courseTitles
      .map((title) => `<li>${escapeHtml(title)}</li>`)
      .join('');
    const note = decision.note
      ? `<p style="margin:0 0 16px;padding:12px;background:#f1f5f9;border-radius:8px">${escapeHtml(decision.note)}</p>`
      : '';
    const url = `${this.frontendUrl}/purchase-history`;

    const body = decision.approved
      ? `<p style="margin:0 0 16px">คำขอคืนเงิน <b>${escapeHtml(decision.amount)}</b> ของคุณได้รับการอนุมัติแล้ว สิทธิ์เข้าเรียนคอร์สต่อไปนี้ถูกยกเลิก</p>
  <ul style="margin:0 0 16px;padding-left:20px">${courses}</ul>
  <p style="margin:0 0 16px">${
    decision.manual
      ? 'เราโอนเงินคืนให้คุณแล้ว ตรวจสอบได้ในบัญชีที่ใช้ชำระเงิน'
      : 'เงินจะคืนเข้าช่องทางที่คุณใช้ชำระ ระยะเวลาขึ้นอยู่กับธนาคารหรือผู้ออกบัตร (โดยทั่วไป 7-14 วันทำการ)'
  }</p>
  ${note}`
      : `<p style="margin:0 0 16px">ขออภัย คำขอคืนเงิน <b>${escapeHtml(decision.amount)}</b> สำหรับคอร์สต่อไปนี้ไม่ได้รับการอนุมัติ คุณยังเข้าเรียนได้ตามปกติ</p>
  <ul style="margin:0 0 16px;padding-left:20px">${courses}</ul>
  ${note}`;

    await this.send(
      to,
      decision.approved
        ? 'คำขอคืนเงินได้รับการอนุมัติ — Learnora'
        : 'ผลการพิจารณาคำขอคืนเงิน — Learnora',
      this.layout(
        decision.approved
          ? 'อนุมัติการคืนเงินแล้ว'
          : 'คำขอคืนเงินไม่ได้รับการอนุมัติ',
        `${body}
  ${this.button(url, 'ดูประวัติการซื้อ')}`,
      ),
    );
  }

  /** แจ้งผู้สอนว่าโอนส่วนแบ่งรายได้ให้แล้ว */
  async sendPayoutNotice(
    to: string,
    payout: { amount: string; reference: string },
  ) {
    const url = `${this.frontendUrl}/instructor/earnings`;

    await this.send(
      to,
      'เราโอนรายได้ให้คุณแล้ว — Learnora',
      this.layout(
        'โอนรายได้ให้แล้ว',
        `<p style="margin:0 0 16px">เราโอนส่วนแบ่งรายได้จากคอร์สของคุณ <b>${escapeHtml(payout.amount)}</b> เข้าบัญชีที่คุณตั้งไว้แล้ว</p>
  <p style="margin:0 0 16px">เลขอ้างอิงการโอน: <b>${escapeHtml(payout.reference)}</b></p>
  ${this.button(url, 'ดูรายได้ของฉัน')}`,
      ),
    );
  }
}
