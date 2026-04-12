/**
 * Блокировка входа после неудачных попыток (Redis).
 * Порог попыток до lockout.
 */
export const AUTH_LOCKOUT_THRESHOLD = 5;

/** TTL блокировки (секунды). */
export const AUTH_LOCKOUT_TTL_SEC = 15 * 60;

/** Окно подсчёта неудачных попыток (секунды). */
export const AUTH_LOCKOUT_WINDOW_TTL_SEC = 15 * 60;

/**
 * Выделенный rate-limit на `/auth/login` по IP.
 * Дополняет AuthLockoutService (который считает только неудачные попытки):
 * это ограничение на общую частоту запросов логина, даже с корректным паролем.
 */
export const AUTH_LOGIN_THROTTLE_LIMIT = 5;
export const AUTH_LOGIN_THROTTLE_TTL_MS = 15 * 60 * 1000;

/** Имя throttler'а — должно совпадать с ключом в ThrottlerModule.forRootAsync */
export const AUTH_THROTTLER_NAME = 'auth';
