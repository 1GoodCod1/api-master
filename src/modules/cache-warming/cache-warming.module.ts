import { Module } from '@nestjs/common';
import { CacheWarmingService } from './cache-warming.service';
import { CacheWarmingController } from './cache-warming.controller';
import { CacheModule } from '../shared/cache/cache.module';
import { MastersModule } from '../masters/masters.module';
import { CategoriesModule } from '../categories/categories.module';
import { CitiesModule } from '../cities/cities.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CacheModule,
    MastersModule,
    CategoriesModule,
    CitiesModule,
    TariffsModule,
    AuthModule,
  ],
  controllers: [CacheWarmingController],
  providers: [CacheWarmingService],
  exports: [CacheWarmingService],
})
export class CacheWarmingModule {}
