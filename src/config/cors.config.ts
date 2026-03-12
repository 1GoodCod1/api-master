/**
 * CORS origins and CSP imgSrc for app bootstrap.
 * Dev: allows localhost. Prod: requires FRONTEND_URL.
 */
export function getCorsOrigins(): string | string[] {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const origins = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      console.error(
        '[FATAL] FRONTEND_URL is required in production. Set env FRONTEND_URL=https://your-domain.com',
      );
      process.exit(1);
    }
    return origins.length === 1 ? origins[0] : origins;
  }
  const list = [
    process.env.FRONTEND_URL,
    'http://localhost:3000', // vite dev
    'http://localhost:4173', // vite preview
  ].filter(Boolean) as string[];
  return list.length
    ? list
    : ['http://localhost:3000', 'http://localhost:4173'];
}

/** CSP imgSrc: only self, data, blob, and allowed app origins (no blanket https:). */
export function getCspImgSrc(): string[] {
  const base = ["'self'", 'data:', 'blob:'];
  const isProd = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.API_URL || (isProd ? '' : 'http://localhost:4000');
  const frontendFallback = isProd
    ? ''
    : 'http://localhost:3000,http://localhost:4173';
  const frontendUrls = (process.env.FRONTEND_URL || frontendFallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [apiUrl, ...frontendUrls].filter((u) => u);
  return [...base, ...origins];
}
