/**
 * Утилита для безопасной валидации slug и ID параметров из URL
 * Защищает от Reflected XSS и Path Traversal атак
 */

/**
 * Валидирует slug - разрешены только буквы, цифры, дефисы и подчеркивания
 *
 * @param slug - Slug для валидации
 * @returns Санитизированный slug или null если невалиден
 *
 * @example
 * validateSlug('john-doe-plumber') // 'john-doe-plumber'
 * validateSlug('john<script>') // null
 * validateSlug('../../../etc/passwd') // null
 */
export function validateSlug(slug: string | undefined | null): string | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  // Разрешаем только буквы (латиница + кириллица), цифры, дефисы и подчеркивания
  // Длина от 1 до 200 символов
  const slugPattern = /^[\p{L}\d_-]{1,200}$/u;

  if (!slugPattern.test(slug)) {
    return null;
  }

  // Дополнительная защита: не разрешаем path traversal паттерны
  if (slug.includes('..') || slug.includes('./') || slug.includes('/../')) {
    return null;
  }

  return slug.trim();
}

/**
 * Валидирует UUID v4
 *
 * @param id - ID для валидации
 * @returns true если валидный UUID
 *
 * @example
 * validateUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * validateUUID('invalid') // false
 * validateUUID('<script>alert(1)</script>') // false
 */
export function validateUUID(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Валидирует CUID (используется Prisma по умолчанию)
 *
 * @param id - ID для валидации
 * @returns true если валидный CUID
 *
 * @example
 * validateCUID('cjld2cjxh0000qzrmn831i7rn') // true
 * validateCUID('invalid') // false
 */
export function validateCUID(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // CUID: начинается с 'c', содержит только буквы и цифры, длина 25 символов
  const cuidPattern = /^c[0-9a-z]{24}$/i;
  return cuidPattern.test(id);
}

/**
 * Универсальная валидация ID - проверяет UUID, CUID или обычный числовой ID
 *
 * @param id - ID для валидации
 * @returns true если ID валиден
 */
export function validateId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Проверяем различные форматы ID
  return validateUUID(id) || validateCUID(id) || /^\d+$/.test(id);
}

/**
 * Санитизирует slug или ID перед использованием
 * Если невалиден - выбрасывает исключение
 *
 * @param value - Значение для санитизации
 * @param type - Тип валидации ('slug' | 'id')
 * @returns Санитизированное значение
 * @throws Error если значение невалидно
 */
export function sanitizeParam(
  value: string | undefined | null,
  type: 'slug' | 'id' = 'id',
): string {
  if (type === 'slug') {
    const sanitized = validateSlug(value);
    if (!sanitized) {
      throw new Error('Invalid slug parameter');
    }
    return sanitized;
  }

  if (type === 'id') {
    if (!validateId(value)) {
      throw new Error('Invalid ID parameter');
    }
    return value!;
  }

  throw new Error('Invalid parameter type');
}

/**
 * Валидирует массив slug/id параметров
 *
 * @param values - Массив значений
 * @param type - Тип валидации
 * @returns Массив валидных значений (невалидные фильтруются)
 */
export function validateParamArray(
  values: (string | undefined | null)[],
  type: 'slug' | 'id' = 'id',
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((v): v is string => !!v)
    .filter((v) => (type === 'slug' ? validateSlug(v) !== null : validateId(v)))
    .map((v) => (type === 'slug' ? validateSlug(v)! : v));
}
