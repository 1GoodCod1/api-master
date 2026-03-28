import type { NotificationCategory } from '@prisma/client';

export interface CreateInAppNotificationParams {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface CreateAdminNotificationParams {
  category: NotificationCategory;
  title: string;
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  metadata?: Record<string, any>;
}
