import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import {
  TelegramJobData,
  type TelegramBroadcastJobData,
} from '../../../shared/types/notification.types';

@Processor('telegram')
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-telegram')
  async handleTelegram(job: Job<TelegramJobData>) {
    this.logger.debug(`Обработка Telegram job ${job.id}`);

    try {
      await this.notificationsService.processTelegramJob(job);
      this.logger.log(`Telegram job ${job.id} успешно выполнен`);
    } catch (error) {
      this.logger.error(`Ошибка обработки Telegram job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('send-broadcast')
  async handleBroadcast(job: Job<TelegramBroadcastJobData>) {
    this.logger.debug(`Processing broadcast job ${job.id}`);

    const { message, options } = job.data;

    try {
      await this.notificationsService.sendTelegram(message, options);
      this.logger.log(`Broadcast job ${job.id} выполнен`);
    } catch (error) {
      this.logger.error(`Ошибка обработки broadcast job ${job.id}:`, error);
      throw error;
    }
  }
}
