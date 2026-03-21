/** Must match `API_GLOBAL_PREFIX` in src/config/http-app.ts */
export const API_V1 = '/api/v1';

export function api(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_V1}${p}`;
}
