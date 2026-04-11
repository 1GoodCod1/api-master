/**
 * Один источник правды для режима httpOnly refresh-куки (как в main.ts CORS credentials).
 * Должен совпадать с VITE_USE_HTTPONLY на фронте.
 */
export function resolveUseHttpOnlyCookie(): boolean {
  return (
    process.env.USE_HTTPONLY_COOKIE === 'true' ||
    (process.env.USE_HTTPONLY_COOKIE === undefined &&
      process.env.NODE_ENV === 'production')
  );
}
