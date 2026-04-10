import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
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

/**
 * Listens to notification events emitted by domain modules
 * and delegates to the actual notification services.
 *
 * This keeps NotificationsModule as the single owner of delivery logic
 * while allowing producers to remain decoupled.
 */
@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly inApp: InAppNotificationService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Generic in-app ──────────────────────────────────────────────

  @OnEvent(NotificationEvent.IN_APP, { async: true })
  async onInApp(payload: InAppNotifyPayload): Promise<void> {
    try {
      await this.inApp.notify(payload.params);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.IN_APP}] failed`, err);
    }
  }

  // ─── Domain-specific ─────────────────────────────────────────────

  @OnEvent(NotificationEvent.NEW_REGISTRATION, { async: true })
  async onNewRegistration(payload: NewRegistrationPayload): Promise<void> {
    try {
      await this.inApp.notifyNewRegistration(payload.data);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.NEW_REGISTRATION}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.NEW_VERIFICATION_REQUEST, { async: true })
  async onNewVerificationRequest(
    payload: NewVerificationRequestPayload,
  ): Promise<void> {
    try {
      await this.inApp.notifyNewVerificationRequest(payload.data);
    } catch (err) {
      this.logger.error(
        `[${NotificationEvent.NEW_VERIFICATION_REQUEST}] failed`,
        err,
      );
    }
  }

  @OnEvent(NotificationEvent.VERIFICATION_APPROVED, { async: true })
  async onVerificationApproved(
    payload: VerificationApprovedPayload,
  ): Promise<void> {
    try {
      await this.inApp.notifyVerificationApproved(
        payload.masterUserId,
        payload.data,
      );
    } catch (err) {
      this.logger.error(
        `[${NotificationEvent.VERIFICATION_APPROVED}] failed`,
        err,
      );
    }
  }

  @OnEvent(NotificationEvent.VERIFICATION_REJECTED, { async: true })
  async onVerificationRejected(
    payload: VerificationRejectedPayload,
  ): Promise<void> {
    try {
      await this.inApp.notifyVerificationRejected(
        payload.masterUserId,
        payload.data,
      );
    } catch (err) {
      this.logger.error(
        `[${NotificationEvent.VERIFICATION_REJECTED}] failed`,
        err,
      );
    }
  }

  @OnEvent(NotificationEvent.NEW_REPORT, { async: true })
  async onNewReport(payload: NewReportPayload): Promise<void> {
    try {
      await this.inApp.notifyNewReport(payload.data);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.NEW_REPORT}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.NEW_PROMOTION, { async: true })
  async onNewPromotion(payload: NewPromotionPayload): Promise<void> {
    try {
      await this.inApp.notifyNewPromotion(payload.clientUserId, payload.data);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.NEW_PROMOTION}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.MASTER_AVAILABLE, { async: true })
  async onMasterAvailable(payload: MasterAvailablePayload): Promise<void> {
    try {
      await this.inApp.notifyMasterAvailable(
        payload.clientUserId,
        payload.data,
      );
    } catch (err) {
      this.logger.error(`[${NotificationEvent.MASTER_AVAILABLE}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.PAYMENT_SUCCESS, { async: true })
  async onPaymentSuccess(payload: PaymentSuccessPayload): Promise<void> {
    try {
      await this.inApp.notifyPaymentSuccess(payload.userId, payload.data);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.PAYMENT_SUCCESS}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.BOOKING_CONFIRMED, { async: true })
  async onBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
    try {
      await this.inApp.notifyBookingConfirmed(
        payload.masterUserId,
        payload.clientUserId,
        payload.data,
      );
    } catch (err) {
      this.logger.error(`[${NotificationEvent.BOOKING_CONFIRMED}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.BOOKING_CANCELLED, { async: true })
  async onBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    try {
      await this.inApp.notifyBookingCancelled(
        payload.masterUserId,
        payload.clientUserId,
        payload.data,
      );
    } catch (err) {
      this.logger.error(`[${NotificationEvent.BOOKING_CANCELLED}] failed`, err);
    }
  }

  // ─── Channel sends ───────────────────────────────────────────────

  @OnEvent(NotificationEvent.SEND_SMS, { async: true })
  async onSendSms(payload: SendSmsPayload): Promise<void> {
    try {
      await this.notifications.sendSMS(
        payload.to,
        payload.message,
        payload.options,
      );
    } catch (err) {
      this.logger.error(`[${NotificationEvent.SEND_SMS}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.SEND_TELEGRAM, { async: true })
  async onSendTelegram(payload: SendTelegramPayload): Promise<void> {
    try {
      await this.notifications.sendTelegram(payload.message, payload.options);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.SEND_TELEGRAM}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.SEND_WHATSAPP, { async: true })
  async onSendWhatsApp(payload: SendWhatsAppPayload): Promise<void> {
    try {
      await this.notifications.sendWhatsApp(payload.to, payload.message);
    } catch (err) {
      this.logger.error(`[${NotificationEvent.SEND_WHATSAPP}] failed`, err);
    }
  }

  @OnEvent(NotificationEvent.SEND_PAYMENT_CONFIRMATION, { async: true })
  async onSendPaymentConfirmation(
    payload: SendPaymentConfirmationPayload,
  ): Promise<void> {
    try {
      await this.notifications.sendPaymentConfirmation(
        payload.to,
        payload.paymentData,
        payload.options,
      );
    } catch (err) {
      this.logger.error(
        `[${NotificationEvent.SEND_PAYMENT_CONFIRMATION}] failed`,
        err,
      );
    }
  }
}
