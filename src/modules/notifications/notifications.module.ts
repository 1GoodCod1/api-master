import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { SmsProcessor } from './proccessor/sms.processor';
import { TelegramProcessor } from './proccessor/telegram.processor';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { NotificationsQueryService } from './services/notifications-query.service';
import { NotificationsActionService } from './services/notifications-action.service';
import { NotificationsSenderService } from './services/notifications-sender.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: 'sms',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          redis: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
            password: configService.get('redis.password'),
            connectTimeout: 10000,
            lazyConnect: true,
            retryStrategy: (times: number) => {
              if (times > 10) return null;
              return Math.min(times * 50, 2000);
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'telegram',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          redis: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
            password: configService.get('redis.password'),
            connectTimeout: 10000,
            lazyConnect: true,
            retryStrategy: (times: number) => {
              if (times > 10) return null;
              return Math.min(times * 50, 2000);
            },
          },
        }),
        inject: [ConfigService],
      },
    ),
    ConfigModule,
    PrismaModule,
    RedisModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsQueryService,
    NotificationsActionService,
    NotificationsSenderService,
    InAppNotificationService,
    SmsProcessor,
    TelegramProcessor,
  ],
  exports: [NotificationsService, InAppNotificationService],
})
export class NotificationsModule {}
