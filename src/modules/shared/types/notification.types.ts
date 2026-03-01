import { NotificationType } from '@prisma/client';

export interface SMSJobData {
  to: string;
  message: string;
  options?: {
    priority?: 'low' | 'normal' | 'high';
    retry?: boolean;
    quietHours?: boolean; // Учитывать тихие часы
  };
}

export interface TelegramJobData {
  message: string;
  options?: {
    chatId?: string;
    parseMode?: 'HTML' | 'Markdown';
    disableNotification?: boolean;
    priority?: 'low' | 'normal' | 'high';
  };
}

export interface TelegramBroadcastJobData {
  message: string;
  options?: { chatId?: string; silent?: boolean };
}

export interface NotificationData {
  type: NotificationType;
  title?: string;
  message: string;
  recipient: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// Тип для общего job
export type JobData = SMSJobData | TelegramJobData;
