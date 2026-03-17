import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';
import { RedisModule } from '../shared/redis/redis.module';
import { PrismaModule } from '../shared/database/prisma.module';
import { WebsocketService } from './websocket.service';
import { WebsocketConnectionService } from './services/websocket-connection.service';
import { WebsocketMessagingService } from './services/websocket-messaging.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    PrismaModule,
  ],
  providers: [
    WebsocketGateway,
    WebsocketService,
    WebsocketConnectionService,
    WebsocketMessagingService,
    WebsocketErrorHandlerService,
  ],
  exports: [WebsocketService, WebsocketGateway],
})
export class WebSocketModule {}
