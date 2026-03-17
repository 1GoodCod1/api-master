/**
 * Форматирует полное имя из firstName и lastName.
 * @returns Строка или fallback при пустом результате
 */
export function formatUserName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string,
): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || fallback || '';
}
