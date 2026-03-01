import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import Twilio from 'twilio';
import axios from 'axios';
import { NotificationType, NotificationStatus } from '@prisma/client';
import {
  SMSJobData,
  TelegramJobData,
} from '../../shared/types/notification.types';
import { NotificationsActionService } from './notifications-action.service';

interface SMSProviderConfig {
  enabled: boolean;
  provider: 'twilio' | 'http' | 'log';
  httpProvider?: {
    url?: string;
    apiKey?: string;
    apiId?: string;
  };
}

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

@Injectable()
export class NotificationsSenderService {
  private readonly logger = new Logger(NotificationsSenderService.name);
  private twilioClient: Twilio.Twilio;

  constructor(
    private readonly configService: ConfigService,
    private readonly actionService: NotificationsActionService,
    @InjectQueue('sms') private readonly smsQueue: Queue,
    @InjectQueue('telegram') private readonly telegramQueue: Queue,
  ) {
    const sid = this.configService.get<string>('twilio.accountSid');
    const auth = this.configService.get<string>('twilio.authToken');
    if (sid && auth) {
      this.twilioClient = Twilio(sid, auth);
    }
  }

  /**
   * Отправить SMS уведомление (с выбором провайдера)
   */
  async sendSMS(
    to: string,
    message: string,
    options?: Record<string, unknown>,
  ) {
    const smsConfig = this.configService.get<SMSProviderConfig>('sms');
    if (!smsConfig?.enabled) {
      this.logger.log(
        `[SMS DISABLED] To ${to}: ${message.substring(0, 50)}...`,
      );
      return;
    }

    const provider = smsConfig.provider || 'log';
    switch (provider) {
      case 'twilio':
        await this.sendViaTwilio(to, message, options);
        break;
      case 'http':
        await this.sendViaHttpProvider(to, message, options);
        break;
      case 'log':
      default:
        this.logger.log(`[SMS LOG] To: ${to}, Message: ${message}`);
        break;
    }
  }

  /**
   * Отправить Telegram уведомление в указанный чат (или в глобальный chatId из конфига)
   */
  async sendTelegram(
    message: string,
    options?: { chatId?: string; silent?: boolean },
  ) {
    const telegramEnabled = this.configService.get<boolean>(
      'notifications.telegramEnabled',
    );
    if (!telegramEnabled) {
      this.logger.log(
        `[TELEGRAM DISABLED] Would send: ${message.substring(0, 50)}...`,
      );
      return;
    }

    const botToken = this.configService.get<string>('telegram.botToken');
    const chatId = options?.chatId ?? this.configService.get('telegram.chatId');

    if (!botToken || !chatId) {
      this.logger.warn('Telegram bot token or chat id not configured');
      return;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: options?.silent || false,
      });
      this.logger.log('Telegram message sent successfully');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send Telegram message: ${msg}`);
      if (this.configService.get('nodeEnv') === 'development') {
        this.logger.log(`[DEV] Telegram message would be: ${message}`);
      }
    }
  }

  /**
   * Отправить WhatsApp уведомление (Twilio WhatsApp API)
   */
  async sendWhatsApp(to: string, message: string) {
    const enabled = this.configService.get<boolean>('whatsapp.enabled');
    if (!enabled) {
      this.logger.log(
        `[WHATSAPP DISABLED] Would send to ${to}: ${message.substring(0, 50)}...`,
      );
      return;
    }

    const senderId = this.configService.get<string>('whatsapp.senderId');
    if (!this.twilioClient || !senderId) {
      this.logger.warn('Twilio client or WhatsApp sender ID not configured');
      return;
    }

    const normalizedTo = to.startsWith('whatsapp:')
      ? to
      : `whatsapp:${to.replace(/\s+/g, '')}`;
    try {
      await this.twilioClient.messages.create({
        body: message,
        to: normalizedTo,
        from: senderId,
      });
      this.logger.log('WhatsApp message sent successfully');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send WhatsApp message: ${msg}`);
      if (this.configService.get('nodeEnv') === 'development') {
        this.logger.log(`[DEV] WhatsApp message would be: ${message}`);
      }
    }
  }

  /**
   * Уведомление о новом лиде: SMS на телефон мастера, Telegram и WhatsApp — по привязанным каналам (premium).
   */
  async sendLeadNotification(
    to: string,
    leadData: LeadNotificationData,
    options?: { telegramChatId?: string; whatsappPhone?: string },
  ) {
    const msg = (leadData.message ?? '').toString();
    const text = `Новая заявка! Клиент: ${leadData.clientName || 'Без имени'}, Телефон: ${leadData.clientPhone}. Сообщение: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`;
    const fullMessage = `📞 Новая заявка #${leadData.leadId}\n${text}`;

    await this.sendSMS(to, text);

    const globalChatId = this.configService.get<string>('telegram.chatId');
    if (options?.telegramChatId) {
      await this.sendTelegram(fullMessage, { chatId: options.telegramChatId });
    }
    if (globalChatId && options?.telegramChatId !== globalChatId) {
      await this.sendTelegram(fullMessage, { chatId: globalChatId });
    } else if (!options?.telegramChatId && globalChatId) {
      await this.sendTelegram(fullMessage);
    }

    if (options?.whatsappPhone) {
      await this.sendWhatsApp(options.whatsappPhone, fullMessage);
    }
  }

  /**
   * Уведомление о подтверждении платежа
   */
  async sendPaymentConfirmation(
    to: string,
    paymentData: PaymentConfirmationData,
  ) {
    const message = `Платеж успешно проведен! Тариф: ${paymentData.tariffType}, Сумма: ${paymentData.amount} MDL. Спасибо!`;
    await this.sendSMS(to, message);
  }

  /**
   * Обработка Job-а на отправку SMS из очереди Bull
   */
  async processSMSJob(job: Job<SMSJobData>) {
    try {
      const { to, message } = job.data;

      if (this.isQuietHours()) {
        this.logger.log(`Queuing SMS for ${to} until morning (Quiet Hours)`);
        await this.delayUntilMorning(job);
        return;
      }

      if (this.twilioClient) {
        await this.twilioClient.messages.create({
          body: message,
          to,
          from: this.configService.get('twilio.phoneNumber'),
        });
      } else {
        await this.sendViaHttpProvider(to, message);
      }

      this.logger.log(`SMS job ${job.id} sent to ${to}`);

      await this.actionService.saveNotification({
        type: NotificationType.SMS,
        recipient: to,
        message,
        status: NotificationStatus.SENT,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute SMS job ${job.id}:`, error);
      await this.actionService.saveNotification({
        type: NotificationType.SMS,
        recipient: job.data.to,
        message: job.data.message,
        status: NotificationStatus.FAILED,
        metadata: { error: errMsg },
      });
      throw error;
    }
  }

  /**
   * Обработка Job-а на отправку Telegram из очереди Bull
   */
  async processTelegramJob(job: Job<TelegramJobData>) {
    try {
      const { message, options } = job.data;
      const botToken = this.configService.get<string>('telegram.botToken');
      const chatId =
        options?.chatId || this.configService.get('telegram.chatId');

      if (!botToken || !chatId) {
        throw new Error('Telegram bot token or chat ID not configured');
      }

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: options?.parseMode || 'HTML',
        disable_notification: options?.disableNotification || false,
      });

      this.logger.log(`Telegram job ${job.id} sent`);

      await this.actionService.saveNotification({
        type: NotificationType.TELEGRAM,
        recipient: chatId,
        message,
        status: NotificationStatus.SENT,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute Telegram job ${job.id}:`, error);
      await this.actionService.saveNotification({
        type: NotificationType.TELEGRAM,
        recipient: 'admin',
        message: job.data.message,
        status: NotificationStatus.FAILED,
        metadata: { error: errMsg },
      });
      throw error;
    }
  }

  private async sendViaTwilio(
    to: string,
    message: string,
    _options?: Record<string, unknown>,
  ) {
    if (!this.twilioClient) {
      this.logger.warn('Twilio client not initialized, skipping SMS');
      return;
    }
    try {
      await this.twilioClient.messages.create({
        body: message,
        to,
        from: this.configService.get('twilio.phoneNumber'),
      });
      this.logger.log(`SMS sent via Twilio to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS via Twilio to ${to}:`, error);
      throw error;
    }
  }

  private async sendViaHttpProvider(
    to: string,
    message: string,
    _options?: Record<string, unknown>,
  ) {
    const httpConfig =
      this.configService.get<SMSProviderConfig['httpProvider']>(
        'sms.httpProvider',
      );
    if (!httpConfig?.url) {
      this.logger.warn('HTTP SMS provider URL not configured');
      return;
    }
    try {
      const params: Record<string, string | number> = {
        api_id: httpConfig.apiId ?? '',
        to: to.replace('+', ''),
        msg: message,
        json: 1,
      };
      if (httpConfig.apiKey) params.api_key = httpConfig.apiKey;

      await axios.post(httpConfig.url, null, {
        params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      this.logger.log(`SMS sent via HTTP provider to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send SMS via HTTP provider to ${to}:`,
        error,
      );
      throw error;
    }
  }

  private isQuietHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 23 || hour < 8;
  }

  private async delayUntilMorning(job: Job<SMSJobData>) {
    const now = new Date();
    const morning = new Date();
    morning.setHours(8, 0, 0, 0);
    if (now > morning) morning.setDate(morning.getDate() + 1);
    await (
      job as Job<SMSJobData> & {
        moveToDelayed(timestamp: number): Promise<void>;
      }
    ).moveToDelayed(morning.getTime());
  }
}
