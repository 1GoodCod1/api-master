import { LeadStatus } from '@prisma/client';

/**
 * Единая точка экспорта Prisma-перечислений и констант приложения.
 * Импортировать только отсюда: `import { … } from '…/common/constants'`.
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

export {
  SUBSCRIPTION_TARIFF_TYPES,
  type SubscriptionTariffType,
} from './subscription-tariff.constants';

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

export { SORT_ASC, SORT_DESC } from './sort-order.constants';

export { isPremiumTariff, isVipOrPremiumTariff } from './tariff.constants';

export { LEADS_EXPORT_COLUMNS } from './export.constants';

export {
  CLIENT_SELECT_BASIC,
  LEAD_SELECT_BASIC,
  MESSAGE_INCLUDE_FILES,
} from './chat-prisma.constants';

export { USER_PROFILE_SELECT } from './profile-select.constant';

export { GDPR_PAGE_SIZE } from './gdpr.constants';

export {
  PHONE_VERIFICATION_CODE_LENGTH,
  PHONE_VERIFICATION_CODE_TTL_MS,
  PHONE_VERIFICATION_MAX_ATTEMPTS,
  PHONE_VERIFICATION_RATE_LIMIT_MS,
} from './phone-verification.constants';

export {
  AUTH_LOCKOUT_THRESHOLD,
  AUTH_LOCKOUT_TTL_SEC,
  AUTH_LOCKOUT_WINDOW_TTL_SEC,
} from './auth-lockout.constants';

export {
  FILES_CLIENT_PHOTO_LIMIT,
  FILES_MAX_FILES_PER_BATCH,
} from './files-limits.constants';

export {
  PROMOTIONS_LIST_DEFAULT_LIMIT,
  PROMOTIONS_LIST_MAX_LIMIT,
  REVIEWS_LIST_DEFAULT_LIMIT,
  REVIEWS_LIST_MAX_LIMIT,
} from './marketplace-list-limits.constants';

export { REFERRAL_REWARD_DAYS } from './referrals.constants';

export {
  RECOMMENDATIONS_RAW_SCORE_POOL,
  RECOMMENDATIONS_VIEW_DECAY_BASE,
} from './recommendations-engine.constants';

export {
  TELEGRAM_CONNECT_START_PREFIX,
  TELEGRAM_CONNECT_TOKEN_TTL_MINUTES,
} from './telegram-connect.constants';

export { PRISMA_STATEMENT_TIMEOUT_MS } from './database.constants';

export {
  CONTROLLER_PATH,
  type ControllerPath,
} from './controller-paths.constants';
