/**
 * Omise.js (Opn Payments) โหลดจาก CDN ของ Opn เท่านั้น ห้าม bundle เอง
 * เลขบัตรส่งจากเบราว์เซอร์ไปที่ Opn ตรง ๆ แล้วได้โทเค็น (tokn_...) กลับมา
 * เซิร์ฟเวอร์เราเห็นแค่โทเค็น ไม่เคยเห็นเลขบัตร
 *
 * อ่าน process.env ตรง ๆ ไม่ import lib/env.ts เพราะไฟล์นี้รันในเบราว์เซอร์
 */
const OMISE_JS_URL = "https://cdn.omise.co/omise.js";

export type CardInput = {
  name: string;
  number: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
};

type OmiseTokenResponse = { id?: string; message?: string };

type OmiseGlobal = {
  setPublicKey(key: string): void;
  createToken(
    type: "card",
    card: Record<string, string | number>,
    callback: (statusCode: number, response: OmiseTokenResponse) => void,
  ): void;
};

declare global {
  interface Window {
    Omise?: OmiseGlobal;
  }
}

let omisePromise: Promise<OmiseGlobal> | null = null;

function loadOmise(): Promise<OmiseGlobal> {
  if (window.Omise) return Promise.resolve(window.Omise);

  omisePromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = OMISE_JS_URL;
    script.async = true;
    script.onload = () => {
      if (!window.Omise) return reject(new Error("Omise.js failed to load"));
      window.Omise.setPublicKey(process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY!);
      resolve(window.Omise);
    };
    script.onerror = () => {
      omisePromise = null; // ให้ลองโหลดใหม่ได้ครั้งหน้า
      reject(new Error("Omise.js failed to load"));
    };
    document.head.appendChild(script);
  });

  return omisePromise;
}

/** แปลงข้อมูลบัตรเป็นโทเค็นใช้ครั้งเดียว ผิดพลาดจะ throw พร้อมข้อความจาก Opn */
export async function createCardToken(card: CardInput): Promise<string> {
  const omise = await loadOmise();

  return new Promise((resolve, reject) => {
    omise.createToken(
      "card",
      {
        name: card.name,
        number: card.number,
        expiration_month: card.expirationMonth,
        expiration_year: card.expirationYear,
        security_code: card.securityCode,
      },
      (statusCode, response) => {
        if (statusCode === 200 && response.id) resolve(response.id);
        else reject(new Error(response.message ?? "Invalid card details"));
      },
    );
  });
}
