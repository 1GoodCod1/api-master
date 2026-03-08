import { Injectable, Logger } from '@nestjs/common';
import { EmailDripService } from '../../email/email-drip.service';

/**
 * TasksDripService — обработка отложенных drip-писем.
 * Вызывается из TasksService каждый час.
 */
@Injectable()
export class TasksDripService {
  private readonly logger = new Logger(TasksDripService.name);

  constructor(private readonly emailDripService: EmailDripService) {}

  async processPendingDrips() {
    try {
      await this.emailDripService.processPendingDrips();
    } catch (err) {
      this.logger.error(`Drip processing failed: ${String(err)}`);
    }
  }
}
