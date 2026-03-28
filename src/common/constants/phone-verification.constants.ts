/** Длина кода SMS при верификации телефона. */
export const PHONE_VERIFICATION_CODE_LENGTH = 6;

/** Срок жизни кода верификации (10 минут). */
export const PHONE_VERIFICATION_CODE_TTL_MS = 10 * 60_000;

/** Минимальный интервал между отправками кода (1 минута). */
export const PHONE_VERIFICATION_RATE_LIMIT_MS = 60_000;

/** Максимум попыток ввода кода до блокировки. */
export const PHONE_VERIFICATION_MAX_ATTEMPTS = 3;
