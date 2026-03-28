/**
 * Поддерживаемые коды языка приложения (шаблоны, preferredLanguage, compliance PDF).
 * Единый источник вместо литералов 'en' | 'ru' | 'ro'.
 */
export const APP_LOCALES = ['en', 'ru', 'ro'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const APP_LOCALE = {
  EN: 'en',
  RU: 'ru',
  RO: 'ro',
} as const satisfies Record<string, AppLocale>;

/** Дефолт для email/шаблонов, если язык не передан или невалиден. */
export const DEFAULT_APP_LOCALE = APP_LOCALE.RO;

export function parseAppLocale(raw: string | null | undefined): AppLocale {
  if (raw != null && APP_LOCALES.includes(raw as AppLocale)) {
    return raw as AppLocale;
  }
  return DEFAULT_APP_LOCALE;
}
