import { Module } from '@nestjs/common';
import { MastersService } from './masters.service';
import { MastersController } from './masters.controller';
import { PortfolioController } from './portfolio.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { CacheModule } from '../shared/cache/cache.module';
import { SearchController } from './search.controller';
import { MastersSearchService } from './services/masters-search.service';
import { MastersSearchSqlService } from './services/masters-search-sql.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersTariffService } from './services/masters-tariff.service';
import { PortfolioService } from './services/portfolio.service';
import { MastersAvailabilityService } from './services/masters-availability.service';

@Module({
  imports: [PrismaModule, RedisModule, CacheModule],
  controllers: [MastersController, SearchController, PortfolioController],
  providers: [
    MastersService,
    MastersSearchService,
    MastersSearchSqlService,
    MastersProfileService,
    MastersPhotosService,
    MastersStatsService,
    MastersTariffService,
    PortfolioService,
    MastersAvailabilityService,
  ],
  exports: [MastersService, MastersAvailabilityService],
})
export class MastersModule {}
