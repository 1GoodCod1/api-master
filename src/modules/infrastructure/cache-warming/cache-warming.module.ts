import { Module } from '@nestjs/common';
import { CacheWarmingService } from './cache-warming.service';
import { CacheWarmingController } from './cache-warming.controller';
import { CacheWarmingTasksService } from './tasks/cache-warming-tasks.service';
import { CacheModule } from '../../shared/cache/cache.module';
import { MastersModule } from '../../marketplace/masters/masters.module';
import { CategoriesModule } from '../../marketplace/categories/categories.module';
import { CitiesModule } from '../../marketplace/cities/cities.module';
import { TariffsModule } from '../../marketplace/tariffs/tariffs.module';
import { PromotionsModule } from '../../marketplace/promotions/promotions.module';
import { AuthModule } from '../../auth/auth/auth.module';

@Module({
  imports: [
    CacheModule,
    MastersModule,
    CategoriesModule,
    CitiesModule,
    TariffsModule,
    PromotionsModule,
    AuthModule,
  ],
  controllers: [CacheWarmingController],
  providers: [CacheWarmingService, CacheWarmingTasksService],
  exports: [CacheWarmingService],
})
export class CacheWarmingModule {}
