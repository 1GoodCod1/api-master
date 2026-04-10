import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { VerifiedGuard } from '../../../common/guards';
import { PromotionsValidationService } from './services/promotions-validation.service';
import { PromotionsActionService } from './services/promotions-action.service';
import { PromotionsQueryService } from './services/promotions-query.service';

@Module({
  imports: [PrismaModule, RedisModule, CacheModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    PromotionsValidationService,
    PromotionsActionService,
    PromotionsQueryService,
    VerifiedGuard,
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
