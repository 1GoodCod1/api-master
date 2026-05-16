import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications/notifications.module';
import { DigestModule } from './digest/digest.module';

@Module({
  imports: [NotificationsModule, DigestModule],
})
export class NotificationsGroupModule {}
