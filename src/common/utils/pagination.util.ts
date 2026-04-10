/**
 * Shared pagination utilities.
 * Eliminates duplicate parseLimit/parsePage logic across services.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and clamp a limit query parameter.
 * @param raw - raw string from query
 * @param defaultVal - default value if raw is falsy
 * @param max - maximum allowed value
 */
export function parseLimit(
  raw?: string | number,
  defaultVal = DEFAULT_LIMIT,
  max = MAX_LIMIT,
): number {
  if (raw === undefined || raw === null) return defaultVal;
  const num = typeof raw === 'number' ? raw : Number(raw) || defaultVal;
  return Math.min(max, Math.max(1, num));
}

/**
 * Parse a page query parameter.
 * @returns parsed page number or undefined if invalid/missing
 */
export function parsePage(raw?: string | number): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const num = typeof raw === 'number' ? raw : Number(raw);
  return Number.isNaN(num) ? undefined : Math.max(1, num);
}
