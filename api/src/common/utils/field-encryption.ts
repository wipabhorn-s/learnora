import * as crypto from 'node:crypto';

/**
 * เข้ารหัสข้อมูลอ่อนไหวทีละช่องก่อนลงฐานข้อมูล (เช่นเลขบัญชีธนาคาร)
 * ฐานข้อมูลหลุดออกไปก็อ่านไม่ได้ถ้าไม่มีกุญแจ (กุญแจอยู่ใน env ไม่อยู่ในฐานข้อมูล)
 *
 * AES-256-GCM: มี auth tag ถ้ามีคนแก้ข้อความที่เข้ารหัสไว้ ถอดรหัสจะล้มเหลวทันที
 * รูปแบบ: "enc:v1:" + base64url(iv 12 ไบต์ | tag 16 ไบต์ | ข้อความที่เข้ารหัส)
 * มีเลขรุ่น (v1) ไว้เปลี่ยนวิธี/กุญแจทีหลังได้โดยยังอ่านของเก่าออก
 */
const PREFIX = 'enc:v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** กุญแจ 32 ไบต์จาก env (base64) ผิดขนาด = โยน error ตอน boot ไม่ใช่ตอนใช้งาน */
export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (base64-encoded)');
  }
  return key;
}

export function encryptField(plain: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return (
    PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
  );
}

/** ข้อมูลเก่าที่ยังไม่ได้เข้ารหัส (ไม่มี prefix) คืนค่าเดิม จะถูกเข้ารหัสเมื่อบันทึกครั้งถัดไป */
export function decryptField(stored: string, key: Buffer): string {
  if (!stored.startsWith(PREFIX)) return stored;

  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}
