/** Экранирование CSV по RFC 4180 */
export function csvEscape(val: string): string {
  const str = String(val ?? '')
    .replace(/\r?\n/g, ' ')
    .trim();
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str || '""';
}
