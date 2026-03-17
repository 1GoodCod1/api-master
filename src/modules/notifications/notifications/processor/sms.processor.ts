import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { SMSJobData } from '../../../shared/types/notification.types';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-sms')
  async handleSMS(job: Job<SMSJobData>) {
    // Указали тип
    this.logger.debug(`Обработка SMS job ${job.id} для ${job.data.to}`);

    try {
      await this.notificationsService.processSMSJob(job);
      this.logger.log(`SMS job ${job.id} успешно выполнен`);
    } catch (error) {
      this.logger.error(`Ошибка обработки SMS job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('send-bulk-sms')
  async handleBulkSMS(job: Job<{ recipients: string[]; message: string }>) {
    this.logger.debug(`Processing bulk SMS job ${job.id}`);

    const { recipients, message } = job.data;

    for (const recipient of recipients) {
      try {
        await this.notificationsService.sendSMS(recipient, message);
        this.logger.log(`Массовая SMS отправлена на ${recipient}`);
      } catch (error) {
        this.logger.error(
          `Ошибка отправки массовой SMS на ${recipient}:`,
          error,
        );
      }
    }
  }
}
