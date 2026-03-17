import { Injectable, Logger } from '@nestjs/common';
import { DigestService } from '../../../notifications/digest/digest.service';

/**
 * TasksDigestService — рассылка дайджеста подписчикам.
 * Вызывается из TasksService по расписанию (ежедневно в полночь).
 */
@Injectable()
export class TasksDigestService {
  private readonly logger = new Logger(TasksDigestService.name);

  constructor(private readonly digestService: DigestService) {}

  async sendDigest() {
    try {
      const sent = await this.digestService.sendDigestToAllSubscribers();
      if (sent > 0) {
        this.logger.log(`Digest sent to ${sent} subscribers`);
      }
    } catch (err) {
      this.logger.error(`Digest send failed: ${String(err)}`);
    }
  }
}
