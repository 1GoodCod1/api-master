import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebPushService } from './web-push.service';
import { WebPushController } from './web-push.controller';
import { PrismaModule } from '../../shared/database/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WebPushController],
  providers: [WebPushService],
  exports: [WebPushService],
})
export class WebPushModule {}
