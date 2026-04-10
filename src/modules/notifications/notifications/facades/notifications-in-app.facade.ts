import { Injectable } from '@nestjs/common';
import type { CreateInAppNotificationParams } from '../../types';
import { InAppNotificationService } from '../services/in-app-notification.service';

/**
 * Публичный контракт модуля уведомлений для in-app / WebSocket / web-push сценариев.
 */
@Injectable()
export class NotificationsInAppFacade {
  constructor(private readonly inApp: InAppNotificationService) {}

  notify(params: CreateInAppNotificationParams) {
    return this.inApp.notify(params);
  }

  notifyNewLead(
    masterUserId: string,
    data: {
      leadId: string;
      clientName?: string;
      clientPhone?: string;
      masterId?: string;
    },
  ) {
    return this.inApp.notifyNewLead(masterUserId, data);
  }

  notifyLeadStatusUpdated(
    masterUserId: string,
    data: { leadId: string; status: string; clientName?: string },
  ) {
    return this.inApp.notifyLeadStatusUpdated(masterUserId, data);
  }

  notifyNewReview(
    masterUserId: string,
    data: {
      reviewId: string;
      rating: number;
      authorName?: string;
      masterId?: string;
    },
  ) {
    return this.inApp.notifyNewReview(masterUserId, data);
  }

  notifyNewChatMessage(
    recipientUserId: string,
    data: {
      conversationId: string;
      messageId: string;
      senderType: string;
      senderName?: string;
    },
  ) {
    return this.inApp.notifyNewChatMessage(recipientUserId, data);
  }

  notifySubscriptionExpiring(
    masterUserId: string,
    data: {
      daysLeft: number;
      tariffType: string;
      expiresAt: Date | string;
      masterId: string;
    },
  ) {
    return this.inApp.notifySubscriptionExpiring(masterUserId, data);
  }

  notifySubscriptionExpired(
    masterUserId: string,
    data: { tariffType: string; masterId: string },
  ) {
    return this.inApp.notifySubscriptionExpired(masterUserId, data);
  }

  notifyLeadSentToClient(
    clientUserId: string,
    data: { leadId: string; masterName: string },
  ) {
    return this.inApp.notifyLeadSentToClient(clientUserId, data);
  }

  notifyMasterAvailable(
    clientUserId: string,
    data: { masterId: string; masterName?: string },
  ) {
    return this.inApp.notifyMasterAvailable(clientUserId, data);
  }
}
