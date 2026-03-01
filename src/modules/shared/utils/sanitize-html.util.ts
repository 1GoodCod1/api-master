import sanitizeHtml from 'sanitize-html';

/**
 * Конфигурация для строгой санитизации (удаляет ВСЕ HTML теги)
 * Используется для пользовательского контента (комментарии, описания, сообщения)
 */
const STRICT_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [], // Не разрешаем никакие HTML теги
  allowedAttributes: {}, // Не разрешаем никакие атрибуты
  disallowedTagsMode: 'recursiveEscape', // Экранируем запрещенные теги вместо удаления
};

/**
 * Конфигурация для базовой санитизации (разрешает безопасное форматирование)
 * Используется для контента, где может быть разрешено базовое форматирование
 */
const BASIC_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape',
};

/**
 * Строгая санитизация - удаляет ВСЕ HTML теги и атрибуты
 * Используется для: комментариев, отзывов, сообщений лидов, описаний
 *
 * @param value - Строка для санитизации
 * @returns Санитизированная строка без HTML
 *
 * @example
 * sanitizeStrict('<script>alert("XSS")</script>Hello')
 * // Результат: '&lt;script&gt;alert("XSS")&lt;/script&gt;Hello'
 */
export function sanitizeStrict(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return sanitizeHtml(value.trim(), STRICT_CONFIG);
}

/**
 * Базовая санитизация - разрешает безопасное форматирование текста
 * Используется для: описаний с базовым форматированием
 *
 * @param value - Строка для санитизации
 * @returns Санитизированная строка с разрешенными тегами
 */
export function sanitizeBasic(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return sanitizeHtml(value.trim(), BASIC_CONFIG);
}

/**
 * Санитизация массива строк
 *
 * @param values - Массив строк для санитизации
 * @param mode - Режим санитизации ('strict' | 'basic')
 * @returns Массив санитизированных строк
 */
export function sanitizeArray(
  values: string[],
  mode: 'strict' | 'basic' = 'strict',
): string[] {
  if (!Array.isArray(values)) {
    return values;
  }

  const sanitizeFn = mode === 'strict' ? sanitizeStrict : sanitizeBasic;
  return values.map((v) => (typeof v === 'string' ? sanitizeFn(v) : v));
}

/**
 * Санитизация объекта (рекурсивно обходит все строковые поля)
 *
 * @param obj - Объект для санитизации
 * @param mode - Режим санитизации
 * @returns Санитизированный объект
 */
export function sanitizeObject(
  obj: unknown,
  mode: 'strict' | 'basic' = 'strict',
): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return sanitizeArray(obj as string[], mode);
  }

  const sanitizeFn = mode === 'strict' ? sanitizeStrict : sanitizeBasic;
  const sanitized: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = (obj as Record<string, unknown>)[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeFn(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, mode);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}
