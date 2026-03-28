/**
 * Блокировка входа после неудачных попыток (Redis).
 * Порог попыток до lockout.
 */
export const AUTH_LOCKOUT_THRESHOLD = 5;

/** TTL блокировки (секунды). */
export const AUTH_LOCKOUT_TTL_SEC = 15 * 60;

/** Окно подсчёта неудачных попыток (секунды). */
export const AUTH_LOCKOUT_WINDOW_TTL_SEC = 15 * 60;
