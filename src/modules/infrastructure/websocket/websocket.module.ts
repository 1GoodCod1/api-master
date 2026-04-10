import { Module } from '@nestjs/common';
import { SharedJwtModule } from '../../shared/jwt/shared-jwt.module';
import { WebsocketGateway } from './websocket.gateway';
import { RedisModule } from '../../shared/redis/redis.module';
import { PrismaModule } from '../../shared/database/prisma.module';
import { WebsocketService } from './websocket.service';
import { WebsocketConnectionService } from './services/websocket-connection.service';
import { WebsocketMessagingService } from './services/websocket-messaging.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';

@Module({
  imports: [SharedJwtModule.forVerify(), RedisModule, PrismaModule],
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
