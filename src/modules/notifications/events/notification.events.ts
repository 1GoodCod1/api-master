import type {
  CreateInAppNotificationParams,
  LeadNotificationData,
  PaymentConfirmationData,
  SaveNotificationParams,
} from '../types';

// ─── Event Names ─────────────────────────────────────────────────────

export const NotificationEvent = {
  // In-app (generic)
  IN_APP: 'notification.in-app',
  IN_APP_ADMINS: 'notification.in-app.admins',

  // Domain-specific in-app
  NEW_LEAD: 'notification.new-lead',
  LEAD_STATUS_UPDATED: 'notification.lead-status-updated',
  LEAD_SENT_TO_CLIENT: 'notification.lead-sent-to-client',
  NEW_REVIEW: 'notification.new-review',
  NEW_CHAT_MESSAGE: 'notification.new-chat-message',
  SUBSCRIPTION_EXPIRING: 'notification.subscription-expiring',
  SUBSCRIPTION_EXPIRED: 'notification.subscription-expired',
  PAYMENT_SUCCESS: 'notification.payment-success',
  PAYMENT_FAILED: 'notification.payment-failed',
  NEW_VERIFICATION_REQUEST: 'notification.new-verification-request',
  VERIFICATION_APPROVED: 'notification.verification-approved',
  VERIFICATION_REJECTED: 'notification.verification-rejected',
  NEW_REPORT: 'notification.new-report',
  NEW_REGISTRATION: 'notification.new-registration',
  SYSTEM_ALERT: 'notification.system-alert',
  MASTER_AVAILABLE: 'notification.master-available',
  NEW_PROMOTION: 'notification.new-promotion',
  BOOKING_CONFIRMED: 'notification.booking-confirmed',
  BOOKING_CANCELLED: 'notification.booking-cancelled',

  // Channel sends
  SEND_SMS: 'notification.send-sms',
  SEND_TELEGRAM: 'notification.send-telegram',
  SEND_WHATSAPP: 'notification.send-whatsapp',
  SEND_LEAD_NOTIFICATION: 'notification.send-lead',
  SEND_PAYMENT_CONFIRMATION: 'notification.send-payment-confirmation',
  SAVE_NOTIFICATION: 'notification.save',
} as const;

// ─── Event Payloads ──────────────────────────────────────────────────

export interface InAppNotifyPayload {
  params: CreateInAppNotificationParams;
}

export interface NewLeadPayload {
  masterUserId: string;
  data: {
    leadId: string;
    clientName?: string;
    clientPhone?: string;
    masterId?: string;
  };
}

export interface LeadStatusUpdatedPayload {
  masterUserId: string;
  data: { leadId: string; status: string; clientName?: string };
}

export interface LeadSentToClientPayload {
  clientUserId: string;
  data: { leadId: string; masterName: string };
}

export interface NewReviewPayload {
  masterUserId: string;
  data: {
    reviewId: string;
    rating: number;
    authorName?: string;
    masterId?: string;
  };
}

export interface NewChatMessagePayload {
  recipientUserId: string;
  data: {
    conversationId: string;
    messageId: string;
    senderType: string;
    senderName?: string;
  };
}

export interface SubscriptionExpiringPayload {
  masterUserId: string;
  data: {
    daysLeft: number;
    tariffType: string;
    expiresAt: Date | string;
    masterId: string;
  };
}

export interface SubscriptionExpiredPayload {
  masterUserId: string;
  data: { tariffType: string; masterId: string };
}

export interface PaymentSuccessPayload {
  userId: string;
  data: { paymentId: string; tariffType: string; amount: string | number };
}

export interface PaymentFailedPayload {
  userId: string;
  data: { paymentId: string; tariffType: string; reason?: string };
}

export interface NewVerificationRequestPayload {
  data: { masterId: string; masterName?: string; verificationId: string };
}

export interface VerificationApprovedPayload {
  masterUserId: string;
  data: { masterId: string; verificationId?: string; isFirst100?: boolean };
}

export interface VerificationRejectedPayload {
  masterUserId: string;
  data: { masterId: string; reason?: string; verificationId?: string };
}

export interface NewReportPayload {
  data: {
    reportId: string;
    reason: string;
    clientId: string;
    masterId: string;
  };
}

export interface NewRegistrationPayload {
  data: { userId: string; role: string; name?: string };
}

export interface SystemAlertPayload {
  data: { alertType: string; message: string; details?: any };
}

export interface MasterAvailablePayload {
  clientUserId: string;
  data: { masterId: string; masterName?: string };
}

export interface NewPromotionPayload {
  clientUserId: string;
  data: {
    masterId: string;
    masterName: string;
    promotionId: string;
    discount: number;
  };
}

export interface BookingConfirmedPayload {
  masterUserId: string;
  clientUserId: string | null;
  data: {
    bookingId: string;
    masterId: string;
    masterName?: string;
    clientName?: string;
    startTime: string;
  };
}

export interface BookingCancelledPayload {
  masterUserId: string;
  clientUserId: string | null;
  data: {
    bookingId: string;
    masterId: string;
    masterName?: string;
    clientName?: string;
    startTime: string;
  };
}

// Channel payloads
export interface SendSmsPayload {
  to: string;
  message: string;
  options?: Record<string, unknown>;
}

export interface SendTelegramPayload {
  message: string;
  options?: { chatId?: string; silent?: boolean };
}

export interface SendWhatsAppPayload {
  to: string;
  message: string;
}

export interface SendLeadNotificationPayload {
  to: string;
  leadData: LeadNotificationData;
  options?: { telegramChatId?: string; whatsappPhone?: string };
}

export interface SendPaymentConfirmationPayload {
  to: string;
  paymentData: PaymentConfirmationData;
  options?: { telegramChatId?: string; whatsappPhone?: string };
}

export interface SaveNotificationPayload {
  params: SaveNotificationParams;
}

// ─── Payload map (for type-safe listeners) ───────────────────────────

export interface NotificationEventMap {
  [NotificationEvent.IN_APP]: InAppNotifyPayload;
  [NotificationEvent.NEW_LEAD]: NewLeadPayload;
  [NotificationEvent.LEAD_STATUS_UPDATED]: LeadStatusUpdatedPayload;
  [NotificationEvent.LEAD_SENT_TO_CLIENT]: LeadSentToClientPayload;
  [NotificationEvent.NEW_REVIEW]: NewReviewPayload;
  [NotificationEvent.NEW_CHAT_MESSAGE]: NewChatMessagePayload;
  [NotificationEvent.SUBSCRIPTION_EXPIRING]: SubscriptionExpiringPayload;
  [NotificationEvent.SUBSCRIPTION_EXPIRED]: SubscriptionExpiredPayload;
  [NotificationEvent.PAYMENT_SUCCESS]: PaymentSuccessPayload;
  [NotificationEvent.PAYMENT_FAILED]: PaymentFailedPayload;
  [NotificationEvent.NEW_VERIFICATION_REQUEST]: NewVerificationRequestPayload;
  [NotificationEvent.VERIFICATION_APPROVED]: VerificationApprovedPayload;
  [NotificationEvent.VERIFICATION_REJECTED]: VerificationRejectedPayload;
  [NotificationEvent.NEW_REPORT]: NewReportPayload;
  [NotificationEvent.NEW_REGISTRATION]: NewRegistrationPayload;
  [NotificationEvent.SYSTEM_ALERT]: SystemAlertPayload;
  [NotificationEvent.MASTER_AVAILABLE]: MasterAvailablePayload;
  [NotificationEvent.NEW_PROMOTION]: NewPromotionPayload;
  [NotificationEvent.BOOKING_CONFIRMED]: BookingConfirmedPayload;
  [NotificationEvent.BOOKING_CANCELLED]: BookingCancelledPayload;
  [NotificationEvent.SEND_SMS]: SendSmsPayload;
  [NotificationEvent.SEND_TELEGRAM]: SendTelegramPayload;
  [NotificationEvent.SEND_WHATSAPP]: SendWhatsAppPayload;
  [NotificationEvent.SEND_LEAD_NOTIFICATION]: SendLeadNotificationPayload;
  [NotificationEvent.SEND_PAYMENT_CONFIRMATION]: SendPaymentConfirmationPayload;
  [NotificationEvent.SAVE_NOTIFICATION]: SaveNotificationPayload;
}
