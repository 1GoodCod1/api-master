import type { NotificationStatus, NotificationType } from '@prisma/client';

export interface SaveNotificationParams {
  type: NotificationType;
  recipient: string;
  message: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  title?: string;
  userId?: string;
}
