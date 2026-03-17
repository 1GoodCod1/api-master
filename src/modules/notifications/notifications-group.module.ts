import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications/notifications.module';
import { DigestModule } from './digest/digest.module';

/**
 * Aggregate module for notifications: in-app, SMS, Telegram, web-push (via NotificationsModule), digest.
 */
@Module({
  imports: [NotificationsModule, DigestModule],
})
export class NotificationsGroupModule {}
