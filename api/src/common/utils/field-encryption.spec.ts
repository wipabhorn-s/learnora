import {
  decryptField,
  encryptField,
  parseEncryptionKey,
} from '@/common/utils/field-encryption';
import * as crypto from 'node:crypto';

const key = crypto.randomBytes(32);

describe('field encryption', () => {
  it('round-trips and never stores the plain value', () => {
    const stored = encryptField('1234567890', key);
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('1234567890');
    expect(decryptField(stored, key)).toBe('1234567890');
  });

  it('uses a fresh IV each time (same number, different ciphertext)', () => {
    expect(encryptField('1234567890', key)).not.toBe(
      encryptField('1234567890', key),
    );
  });

  it('refuses tampered data and the wrong key', () => {
    const stored = encryptField('1234567890', key);
    const tampered = stored.slice(0, -2) + (stored.endsWith('A') ? 'BB' : 'AA');
    expect(() => decryptField(tampered, key)).toThrow();
    expect(() => decryptField(stored, crypto.randomBytes(32))).toThrow();
  });

  it('passes through older plain values (encrypted on the next save)', () => {
    expect(decryptField('1234567890', key)).toBe('1234567890');
  });

  it('only accepts a 32-byte key', () => {
    expect(() =>
      parseEncryptionKey(crypto.randomBytes(16).toString('base64')),
    ).toThrow();
    expect(parseEncryptionKey(key.toString('base64'))).toHaveLength(32);
  });
});
