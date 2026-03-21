import { randomBytes } from 'crypto';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ALPHABET_LEN = ALPHABET.length; // 62

/**
 * Генерация короткого уникального ID (по умолчанию 10 символов).
 * Алфавит: 0-9 A-Z a-z (62 символа).
 * 10 символов → 62^10 ≈ 8.4 × 10^17 возможных значений.
 */
export function generateShortId(length = 10): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET_LEN];
  }
  return id;
}
