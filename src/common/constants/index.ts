/**
 * Единая точка экспорта Prisma-перечислений и констант.
 * Использовать вместо хардкода строк во всём проекте.
 */
export {
  LeadStatus,
  PaymentStatus,
  ReviewStatus,
  TariffType,
  UserRole,
  VerificationStatus,
  NotificationStatus,
  ReportStatus,
  BookingStatus,
} from '@prisma/client';
