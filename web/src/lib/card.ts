/** จัดรูปแบบและตรวจข้อมูลบัตรในหน้าชำระเงิน (ก่อนส่งให้ Omise.js ทำโทเค็น) */

/**
 * จำนวนหลักที่บัตรแต่ละแบบมีได้ ดูจากเลขหน้า (ช่วงที่ Opn รับ)
 * Amex 15 หลัก, UnionPay 16-19 หลัก, ที่เหลือ (Visa, Mastercard, JCB) 16 หลัก
 */
export const cardLengths = (digits: string): number[] => {
  if (/^3[47]/.test(digits)) return [15];
  if (/^62/.test(digits)) return [16, 17, 18, 19];
  return [16];
};

/** สูตรตรวจเลขบัตรมาตรฐาน (Luhn) จับเลขพิมพ์ผิด/สลับหลักได้ก่อนส่งไป Opn */
export const passesLuhn = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

/**
 * "4242424242424242" → "4242 4242 4242 4242"
 * Amex จัดกลุ่ม 4-6-5 ตามที่พิมพ์บนบัตร: "3782 822463 10005"
 * ตัดหลักเกินตามประเภทบัตร พิมพ์เกินไม่ได้
 */
export const formatCardNumber = (value: string) => {
  const raw = value.replace(/\D/g, "");
  const digits = raw.slice(0, Math.max(...cardLengths(raw)));

  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

/** "1228" → "12/28" */
export const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
};
