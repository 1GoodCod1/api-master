import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../modules/shared/database/prisma.module';
import { RedisModule } from '../modules/shared/redis/redis.module';
import { AppSettingsModule } from '../modules/app-settings/app-settings.module';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, AppSettingsModule],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
