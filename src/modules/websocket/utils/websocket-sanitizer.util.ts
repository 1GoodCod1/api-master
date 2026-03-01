import {
  sanitizeObject,
  sanitizeStrict,
} from '../../shared/utils/sanitize-html.util';

/**
 * Утилиты для санитизации данных WebSocket
 * Защищает от XSS атак и инъекций через WebSocket сообщения
 */

/**
 * Санитизация данных уведомления перед отправкой через WebSocket
 * Удаляет потенциально опасный HTML и JavaScript
 */
export function sanitizeNotificationData(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const source = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };

  if (typeof sanitized.title === 'string') {
    sanitized.title = sanitizeStrict(sanitized.title);
  }

  if (typeof sanitized.message === 'string') {
    sanitized.message = sanitizeStrict(sanitized.message);
  }

  if (
    sanitized.data !== null &&
    sanitized.data !== undefined &&
    typeof sanitized.data === 'object'
  ) {
    sanitized.data = sanitizeObject(sanitized.data, 'strict');
  }

  if (
    sanitized.metadata !== null &&
    sanitized.metadata !== undefined &&
    typeof sanitized.metadata === 'object'
  ) {
    sanitized.metadata = sanitizeObject(sanitized.metadata, 'strict');
  }

  return sanitized;
}

/**
 * Санитизация данных лида
 */
export function sanitizeLeadData(leadData: unknown): unknown {
  if (!leadData || typeof leadData !== 'object' || Array.isArray(leadData)) {
    return leadData;
  }

  const source = leadData as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };

  if (typeof sanitized.clientName === 'string') {
    sanitized.clientName = sanitizeStrict(sanitized.clientName);
  }

  if (typeof sanitized.message === 'string') {
    sanitized.message = sanitizeStrict(sanitized.message);
  }

  if (typeof sanitized.clientPhone === 'string') {
    sanitized.clientPhone = sanitizeStrict(sanitized.clientPhone).replace(
      /[^\d+\-() ]/g,
      '',
    );
  }

  return sanitized;
}

/**
 * Санитизация данных платежа
 */
export function sanitizePaymentData(paymentData: unknown): unknown {
  if (
    !paymentData ||
    typeof paymentData !== 'object' ||
    Array.isArray(paymentData)
  ) {
    return paymentData;
  }

  const source = paymentData as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };

  if (typeof sanitized.tariffType === 'string') {
    sanitized.tariffType = sanitizeStrict(sanitized.tariffType);
  }

  // Важные: не санитизируем числовые поля (amount, id и т.д.)
  // но проверяем их тип
  if (
    sanitized.amount !== undefined &&
    sanitized.amount !== null &&
    typeof sanitized.amount !== 'number'
  ) {
    sanitized.amount = Number(sanitized.amount) || 0;
  }

  return sanitized;
}

/**
 * Санитизация данных отзыва
 */
export function sanitizeReviewData(reviewData: unknown): unknown {
  if (
    !reviewData ||
    typeof reviewData !== 'object' ||
    Array.isArray(reviewData)
  ) {
    return reviewData;
  }

  const source = reviewData as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };

  if (typeof sanitized.comment === 'string') {
    sanitized.comment = sanitizeStrict(sanitized.comment);
  }

  // Проверяем рейтинг (должен быть числом от 1 до 5)
  if (sanitized.rating !== undefined && sanitized.rating !== null) {
    const rating =
      typeof sanitized.rating === 'number'
        ? sanitized.rating
        : Number(sanitized.rating);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      sanitized.rating = 5; // Значение по умолчанию
    } else {
      sanitized.rating = Math.round(rating);
    }
  }

  return sanitized;
}

/**
 * Санитизация произвольных данных для WebSocket
 * Рекурсивно санитизирует все строковые поля
 */
export function sanitizeWebSocketData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeStrict(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeWebSocketData(item));
  }

  if (typeof data === 'object') {
    return sanitizeObject(data, 'strict');
  }

  return data;
}

/**
 * Валидация и санитизация masterId
 */
export function sanitizeMasterId(masterId: any): string | null {
  if (!masterId) {
    return null;
  }

  const id = String(masterId).trim();

  // UUID формат или простой ID (только буквы, цифры, дефисы)
  if (!/^[a-zA-Z0-9\\-]+$/.test(id)) {
    return null;
  }

  return id;
}

/**
 * Валидация и санитизация userId
 */
export function sanitizeUserId(userId: any): string | null {
  if (!userId) {
    return null;
  }

  const id = String(userId).trim();

  // UUID формат или простой ID
  if (!/^[a-zA-Z0-9\\-]+$/.test(id)) {
    return null;
  }

  return id;
}
