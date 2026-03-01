/**
 * Безопасное кодирование ID для использования в URL
 * Использует base64url кодирование с секретом
 * Простая реализация для совместимости с frontend
 *
 * ОБЯЗАТЕЛЬНО: установите ID_ENCRYPTION_SECRET в .env (dev и prod).
 * Генерация: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const SECRET = process.env.ID_ENCRYPTION_SECRET?.trim();
if (!SECRET) {
  throw new Error(
    'ID_ENCRYPTION_SECRET must be set. Add to .env: ID_ENCRYPTION_SECRET=<32-char-secret>',
  );
}

/**
 * Кодирование ID в безопасный формат для URL
 */
export function encodeId(id: string): string {
  try {
    const combined = `${SECRET}:${id}`;
    const encoded = Buffer.from(combined)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return encoded;
  } catch {
    return id; // Fallback
  }
}

/**
 * Декодирование закодированного ID из URL
 */
export function decodeId(encoded: string): string | null {
  try {
    // Восстанавливаем base64url в обычный base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

    // Добавляем padding если нужно
    const padLength = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padLength);

    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const [secret, id] = decoded.split(':');

    if (secret !== SECRET || !id) return null;
    return id;
  } catch {
    return null;
  }
}

/**
 * Проверка валидности закодированного ID
 */
export function isValidEncodedId(encoded: string): boolean {
  return decodeId(encoded) !== null;
}
