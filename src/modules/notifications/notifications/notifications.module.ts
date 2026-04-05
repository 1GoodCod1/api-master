import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { SmsProcessor } from './processor/sms.processor';
import { TelegramProcessor } from './processor/telegram.processor';
import { NotificationsController } from './notifications.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramConnectService } from './services/telegram-connect.service';
import { TelegramWebhookSecretGuard } from '../../../common/guards';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { NotificationsQueryService } from './services/notifications-query.service';
import { NotificationsActionService } from './services/notifications-action.service';
import { NotificationsSenderService } from './services/notifications-sender.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { WebSocketModule } from '../../infrastructure/websocket/websocket.module';
import { WebPushModule } from '../web-push/web-push.module';
import { createBullOptions } from '../../../config/bull.config';

@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: 'sms',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          createBullOptions(configService),
        inject: [ConfigService],
      },
      {
        name: 'telegram',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          createBullOptions(configService),
        inject: [ConfigService],
      },
    ),
    ConfigModule,
    PrismaModule,
    RedisModule,
    WebSocketModule,
    WebPushModule,
  ],
  controllers: [NotificationsController, TelegramWebhookController],
  providers: [
    NotificationsService,
    NotificationsQueryService,
    NotificationsActionService,
    NotificationsSenderService,
    InAppNotificationService,
    SmsProcessor,
    TelegramProcessor,
    TelegramConnectService,
    TelegramWebhookSecretGuard,
  ],
  exports: [
    NotificationsService,
    InAppNotificationService,
    TelegramConnectService,
  ],
})
export class NotificationsModule {}
