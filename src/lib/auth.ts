import crypto from 'crypto';

// scrypt 파라미터 — 적당한 비용(CPU ~100ms)과 호환성 균형
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN  = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto
    .scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
    .toString('hex');
  return { hash, salt };
}

// timingSafeEqual로 타이밍 공격 방지
export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): boolean {
  try {
    const derived = crypto.scryptSync(password, storedSalt, KEY_LEN, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    });
    const stored = Buffer.from(storedHash, 'hex');
    if (derived.length !== stored.length) return false;
    return crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}
