import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { AnalyticsMasterService } from './services/analytics-master.service';
import { AnalyticsBusinessService } from './services/analytics-business.service';
import { AnalyticsSystemService } from './services/analytics-system.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsMasterService,
    AnalyticsBusinessService,
    AnalyticsSystemService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
