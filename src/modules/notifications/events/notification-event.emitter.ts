import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationEvent,
  type BookingCancelledPayload,
  type BookingConfirmedPayload,
  type InAppNotifyPayload,
  type MasterAvailablePayload,
  type NewPromotionPayload,
  type NewRegistrationPayload,
  type NewReportPayload,
  type NewVerificationRequestPayload,
  type PaymentSuccessPayload,
  type SendPaymentConfirmationPayload,
  type SendSmsPayload,
  type SendTelegramPayload,
  type SendWhatsAppPayload,
  type VerificationApprovedPayload,
  type VerificationRejectedPayload,
} from './notification.events';
import type { CreateInAppNotificationParams } from '../types';

/**
 * Typed event emitter for notifications.
 * Consumers inject this instead of InAppNotificationService / NotificationsService
 * to avoid direct coupling to NotificationsModule.
 *
 * All methods are fire-and-forget — the actual delivery is handled
 * by NotificationEventListener inside NotificationsModule.
 */
@Injectable()
export class NotificationEventEmitter {
  constructor(private readonly events: EventEmitter2) {}

  // ─── Generic in-app ──────────────────────────────────────────────

  notify(params: CreateInAppNotificationParams): void {
    this.events.emit(NotificationEvent.IN_APP, {
      params,
    } satisfies InAppNotifyPayload);
  }

  // ─── Domain-specific helpers (mirror InAppNotificationService) ───

  notifyNewRegistration(data: NewRegistrationPayload['data']): void {
    this.events.emit(NotificationEvent.NEW_REGISTRATION, { data });
  }

  notifyNewVerificationRequest(
    data: NewVerificationRequestPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.NEW_VERIFICATION_REQUEST, { data });
  }

  notifyVerificationApproved(
    masterUserId: string,
    data: VerificationApprovedPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.VERIFICATION_APPROVED, {
      masterUserId,
      data,
    });
  }

  notifyVerificationRejected(
    masterUserId: string,
    data: VerificationRejectedPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.VERIFICATION_REJECTED, {
      masterUserId,
      data,
    });
  }

  notifyNewReport(data: NewReportPayload['data']): void {
    this.events.emit(NotificationEvent.NEW_REPORT, { data });
  }

  notifyNewPromotion(
    clientUserId: string,
    data: NewPromotionPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.NEW_PROMOTION, { clientUserId, data });
  }

  notifyMasterAvailable(
    clientUserId: string,
    data: MasterAvailablePayload['data'],
  ): void {
    this.events.emit(NotificationEvent.MASTER_AVAILABLE, {
      clientUserId,
      data,
    });
  }

  notifyPaymentSuccess(
    userId: string,
    data: PaymentSuccessPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.PAYMENT_SUCCESS, { userId, data });
  }

  notifyBookingConfirmed(
    masterUserId: string,
    clientUserId: string | null,
    data: BookingConfirmedPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.BOOKING_CONFIRMED, {
      masterUserId,
      clientUserId,
      data,
    });
  }

  notifyBookingCancelled(
    masterUserId: string,
    clientUserId: string | null,
    data: BookingCancelledPayload['data'],
  ): void {
    this.events.emit(NotificationEvent.BOOKING_CANCELLED, {
      masterUserId,
      clientUserId,
      data,
    });
  }

  // ─── Channel sends ───────────────────────────────────────────────

  sendSMS(
    to: string,
    message: string,
    options?: Record<string, unknown>,
  ): void {
    this.events.emit(NotificationEvent.SEND_SMS, {
      to,
      message,
      options,
    } satisfies SendSmsPayload);
  }

  sendTelegram(
    message: string,
    options?: SendTelegramPayload['options'],
  ): void {
    this.events.emit(NotificationEvent.SEND_TELEGRAM, {
      message,
      options,
    } satisfies SendTelegramPayload);
  }

  sendWhatsApp(to: string, message: string): void {
    this.events.emit(NotificationEvent.SEND_WHATSAPP, {
      to,
      message,
    } satisfies SendWhatsAppPayload);
  }

  sendPaymentConfirmation(
    to: string,
    paymentData: SendPaymentConfirmationPayload['paymentData'],
    options?: SendPaymentConfirmationPayload['options'],
  ): void {
    this.events.emit(NotificationEvent.SEND_PAYMENT_CONFIRMATION, {
      to,
      paymentData,
      options,
    } satisfies SendPaymentConfirmationPayload);
  }
}
