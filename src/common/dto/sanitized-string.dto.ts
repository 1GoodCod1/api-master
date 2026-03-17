import { Transform } from 'class-transformer';
import { sanitizeStrict } from '../../modules/shared/utils/sanitize-html.util';

/**
 * Property decorator that sanitizes string values using sanitizeStrict.
 * Use on DTO string fields that receive user/admin input (e.g. name, slug, description).
 */
export function SanitizedString() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : value,
  );
}
