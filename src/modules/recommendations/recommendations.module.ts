import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { RecommendationsEngineService } from './services/recommendations-engine.service';
import { RecommendationsTrackerService } from './services/recommendations-tracker.service';
import { RecommendationsHistoryService } from './services/recommendations-history.service';
import { RecommendationsListener } from './listeners/recommendations.listener';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RecommendationsEngineService,
    RecommendationsTrackerService,
    RecommendationsHistoryService,
    RecommendationsListener,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
