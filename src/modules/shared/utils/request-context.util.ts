/**
 * Минимальный интерфейс для извлечения IP и User-Agent из HTTP-запроса.
 */
export type RequestLike = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string } | null;
};

export type RequestContext = {
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

/**
 * Извлекает IP и User-Agent из запроса.
 * Используется в auth, leads, recommendations и др.
 */
export function extractRequestContext(req: RequestLike): RequestContext {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ipAddress =
    req.ip ||
    (typeof forwarded === 'string' ? forwarded : undefined) ||
    req.socket?.remoteAddress;
  const userAgent =
    typeof req.headers?.['user-agent'] === 'string'
      ? req.headers['user-agent']
      : undefined;
  return { ipAddress, userAgent };
}
