import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';

// Специализированные сервисы
import { ReviewsActionService } from './services/reviews-action.service';
import { ReviewsQueryService } from './services/reviews-query.service';

@Module({
  imports: [PrismaModule, RedisModule, NotificationsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsActionService, ReviewsQueryService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
