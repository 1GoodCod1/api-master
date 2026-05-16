export const APP_TIMEZONE = 'Europe/Chisinau';

/**
 * Локаль приложения для форматирования дат (Молдова).
 * ro-MD — румынский (официальный), ru-MD — русский.
 */
export const APP_LOCALE = 'ro-MD';

export function getHourInMoldova(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).format(date),
    10,
  );
}

export function toDateStringMoldova(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getDayInMoldova(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const y = get('year');
  const m = get('month') - 1;
  const d = get('day');
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

export function getStartOfDateInMoldova(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const y = get('year');
  const m = get('month') - 1;
  const d = get('day');
  const noonUtc = new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
  const hourInMoldova = getHourInMoldova(noonUtc);
  return new Date(Date.UTC(y, m, d, 12 - hourInMoldova, 0, 0, 0));
}

export function getStartOfTodayInMoldova(): Date {
  return getStartOfDateInMoldova(new Date());
}

export function getStartOfDaysAgoInMoldova(days: number): Date {
  const todayStart = getStartOfTodayInMoldova();
  const targetDate = new Date(
    todayStart.getTime() - days * 24 * 60 * 60 * 1000,
  );
  return getStartOfDateInMoldova(targetDate);
}
