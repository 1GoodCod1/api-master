import { Module } from '@nestjs/common';
import { CacheWarmingService } from './cache-warming.service';
import { CacheWarmingController } from './cache-warming.controller';
import { CacheWarmingTasksService } from './tasks/cache-warming-tasks.service';
import { CacheModule } from '../shared/cache/cache.module';
import { MastersModule } from '../masters/masters.module';
import { CategoriesModule } from '../categories/categories.module';
import { CitiesModule } from '../cities/cities.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AuthModule } from '../auth/auth.module';

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
