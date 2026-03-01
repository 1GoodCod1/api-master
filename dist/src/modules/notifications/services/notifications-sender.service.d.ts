import { ConfigService } from '@nestjs/config';
import type { Queue, Job } from 'bull';
import { SMSJobData, TelegramJobData } from '../../shared/types/notification.types';
import { NotificationsActionService } from './notifications-action.service';
export interface LeadNotificationData {
    message?: string;
    clientName?: string;
    clientPhone?: string;
    leadId?: string;
    isPremium?: boolean;
}
export interface PaymentConfirmationData {
    tariffType: string;
    amount: number | string;
}
export declare class NotificationsSenderService {
    private readonly configService;
    private readonly actionService;
    private readonly smsQueue;
    private readonly telegramQueue;
    private readonly logger;
    private twilioClient;
    constructor(configService: ConfigService, actionService: NotificationsActionService, smsQueue: Queue, telegramQueue: Queue);
    sendSMS(to: string, message: string, options?: Record<string, unknown>): Promise<void>;
    sendTelegram(message: string, options?: {
        chatId?: string;
        silent?: boolean;
    }): Promise<void>;
    sendWhatsApp(to: string, message: string): Promise<void>;
    sendLeadNotification(to: string, leadData: LeadNotificationData, options?: {
        telegramChatId?: string;
        whatsappPhone?: string;
    }): Promise<void>;
    sendPaymentConfirmation(to: string, paymentData: PaymentConfirmationData): Promise<void>;
    processSMSJob(job: Job<SMSJobData>): Promise<void>;
    processTelegramJob(job: Job<TelegramJobData>): Promise<void>;
    private sendViaTwilio;
    private sendViaHttpProvider;
    private isQuietHours;
    private delayUntilMorning;
}
