import { RESEND_COOLDOWN_SECONDS } from "@/lib/constants/auth";
import { cookies } from "next/headers";

/**
 * จำว่าเพิ่งส่งเมลไปที่อีเมลไหน เมื่อไหร่ ให้หน้า "Check your inbox" แสดง
 * อีเมลและนับถอยหลังปุ่มส่งซ้ำต่อได้ถูกต้องแม้กดรีเฟรช
 *
 * เก็บในคุกกี้ httpOnly แทน ?email= ใน URL เพราะ URL ไปค้างอยู่ในประวัติ
 * เบราว์เซอร์และ log ของเซิร์ฟเวอร์ ส่วนคุกกี้ไม่โผล่ที่ไหนและหายเองใน 10 นาที
 */
export type EmailSentKind = "verify" | "reset";

const COOKIE_NAME: Record<EmailSentKind, string> = {
  verify: "learnora.verify_email_sent",
  reset: "learnora.reset_email_sent",
};

const MAX_AGE_SECONDS = 60 * 10;

export async function rememberEmailSent(kind: EmailSentKind, email: string) {
  const cookieStore = await cookies();

  cookieStore.set(
    COOKIE_NAME[kind],
    JSON.stringify({ email, sentAt: Date.now() }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE_SECONDS,
      path: "/",
    },
  );
}

export async function readEmailSent(
  kind: EmailSentKind,
): Promise<{ email: string; cooldownSeconds: number } | null> {
  const raw = (await cookies()).get(COOKIE_NAME[kind])?.value;
  if (!raw) return null;

  try {
    const { email, sentAt } = JSON.parse(raw) as {
      email?: unknown;
      sentAt?: unknown;
    };
    if (typeof email !== "string" || typeof sentAt !== "number") return null;

    const elapsed = Math.floor((Date.now() - sentAt) / 1000);
    return {
      email,
      cooldownSeconds: Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed),
    };
  } catch {
    // คุกกี้เสียหรือถูกแก้มา ทำเหมือนไม่มี ผู้ใช้ยังพิมพ์อีเมลเองได้
    return null;
  }
}
