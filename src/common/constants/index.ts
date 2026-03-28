import { LeadStatus, TariffType } from '@prisma/client';

/**
 * Единая точка экспорта Prisma-перечислений и констант.
 * Использовать вместо хардкода строк во всём проекте.
 */
export {
  AvailabilityStatus,
  BookingStatus,
  ConsentType,
  FileType,
  LeadNotifyChannel,
  LeadStatus,
  NotificationCategory,
  NotificationStatus,
  PaymentStatus,
  ReferralStatus,
  ReportAction,
  ReportStatus,
  ReviewStatus,
  SenderType,
  TariffType,
  UserRole,
  VerificationStatus,
} from '@prisma/client';

/** Активная заявка (ещё не CLOSED / SPAM). */
export const ACTIVE_LEAD_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.NEW,
  LeadStatus.IN_PROGRESS,
];

/** Финальные статусы (без обратного перехода для мастера). */
export const FINAL_LEAD_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.CLOSED,
  LeadStatus.SPAM,
];

/** VIP / PREMIUM — платные тарифы с датой окончания подписки. */
export const SUBSCRIPTION_TARIFF_TYPES: ReadonlyArray<TariffType> = [
  TariffType.VIP,
  TariffType.PREMIUM,
];

/** Подмножество тарифов с подпиской (для типов DTO / claim free plan). */
export type SubscriptionTariffType = (typeof SUBSCRIPTION_TARIFF_TYPES)[number];

export {
  ANALYTICS_TIMEFRAME,
  ANALYTICS_TIMEFRAMES,
  type AnalyticsTimeframe,
  VIEWS_HISTORY_PERIOD,
  VIEWS_HISTORY_PERIODS,
  type ViewsHistoryPeriod,
} from './stats-periods.constants';

export {
  APP_LOCALE,
  APP_LOCALES,
  type AppLocale,
  DEFAULT_APP_LOCALE,
  parseAppLocale,
} from './locale.constants';

export { ACTIVE_BOOKING_STATUSES } from './booking-status.constants';
