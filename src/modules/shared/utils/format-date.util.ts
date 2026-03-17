import { APP_LOCALE } from './timezone.util';

/**
 * Форматирует дату/время для отображения пользователю (локаль приложения — Молдова).
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString(APP_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
