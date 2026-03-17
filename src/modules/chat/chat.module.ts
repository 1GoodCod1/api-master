import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatBroadcastService } from './chat-broadcast.service';
import { ChatConversationService } from './services/chat-conversation.service';
import { ChatMessageService } from './services/chat-message.service';
import { ChatLeadTransitionService } from './services/chat-lead-transition.service';
import { ChatGatewayNotificationService } from './services/chat-gateway-notification.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../shared/cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CacheModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatConversationService,
    ChatMessageService,
    ChatLeadTransitionService,
    ChatGatewayNotificationService,
    ChatService,
    ChatGateway,
    ChatBroadcastService,
  ],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
