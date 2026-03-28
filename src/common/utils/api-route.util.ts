import { API_GLOBAL_PREFIX } from '../../config';

const PREFIX_PATH = `/${API_GLOBAL_PREFIX}`;

/** Strips `/api/v1` when present so route checks work with and without global prefix. */
export function stripApiPrefix(path: string): string {
  const p = path.split('?')[0] ?? path;
  if (!p.startsWith(PREFIX_PATH)) {
    return p;
  }
  const rest = p.slice(PREFIX_PATH.length);
  return rest ? (rest.startsWith('/') ? rest : `/${rest}`) : '/';
}
