/**
 * Переопределения лимитов throttler'а для конкретных групп ручек.
 * Все значения применяются поверх глобального бакета `default`
 * через декоратор `@Throttle({ default: { limit, ttl } })`.
 */

/** Публичные read-only эндпоинты (главная, каталог, карточки). SPA дёргает их пачками. */
export const PUBLIC_READ_THROTTLE_LIMIT = 600;
export const PUBLIC_READ_THROTTLE_TTL_MS = 60_000;

/** Поиск/подсказки — debounce во фронте всё равно генерирует серии запросов. */
export const SEARCH_THROTTLE_LIMIT = 60;
export const SEARCH_THROTTLE_TTL_MS = 60_000;
