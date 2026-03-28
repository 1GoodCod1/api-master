/**
 * Единый источник строковых периодов для аналитики, аудита и истории просмотров.
 * Значения совпадают с query-параметрами API.
 */

/** Аналитика и аудит: day | week | month */
export const ANALYTICS_TIMEFRAMES = ['day', 'week', 'month'] as const;
export type AnalyticsTimeframe = (typeof ANALYTICS_TIMEFRAMES)[number];

export const ANALYTICS_TIMEFRAME = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const satisfies Record<string, AnalyticsTimeframe>;

/** История просмотров профиля мастера: week | month */
export const VIEWS_HISTORY_PERIODS = ['week', 'month'] as const;
export type ViewsHistoryPeriod = (typeof VIEWS_HISTORY_PERIODS)[number];

export const VIEWS_HISTORY_PERIOD = {
  WEEK: 'week',
  MONTH: 'month',
} as const satisfies Record<string, ViewsHistoryPeriod>;
