import { Module } from '@nestjs/common';
import { MastersService } from './masters.service';
import { MastersController } from './masters.controller';
import { MastersSettingsController } from './masters-settings.controller';
import { MastersStatsController } from './masters-stats.controller';
import { MastersMediaController } from './masters-media.controller';
import { PortfolioController } from './portfolio.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';
import { SearchController } from './search.controller';
import { AuditModule } from '../../audit/audit.module';
import { FilesModule } from '../../infrastructure/files/files.module';
import { MastersListingService } from './services/masters-listing.service';
import { MastersSearchService } from './services/masters-search.service';
import { MastersSearchSqlService } from './services/masters-search-sql.service';
import { MastersSuggestService } from './services/masters-suggest.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersPublicProfileService } from './services/masters-public-profile.service';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersTariffService } from './services/masters-tariff.service';
import { PortfolioService } from './services/portfolio.service';
import { MastersAvailabilityService } from './services/masters-availability.service';
import { MastersNotificationSettingsService } from './services/masters-notification-settings.service';
import { MastersScheduleService } from './services/masters-schedule.service';
import { MastersQuickRepliesService } from './services/masters-quick-replies.service';
import { MastersLandingStatsService } from './services/masters-landing-stats.service';
import { MastersAvailabilityFacade } from './facades/masters-availability.facade';
import { MastersReferralsFacade } from './facades/masters-referrals.facade';
import { MastersCacheWarmingFacade } from './facades/masters-cache-warming.facade';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CacheModule,
    NotificationsModule,
    AuditModule,
    FilesModule,
  ],
  controllers: [
    MastersController,
    MastersSettingsController,
    MastersStatsController,
    MastersMediaController,
    SearchController,
    PortfolioController,
  ],
  providers: [
    MastersService,
    MastersListingService,
    MastersSearchService,
    MastersSearchSqlService,
    MastersSuggestService,
    MastersProfileService,
    MastersPublicProfileService,
    MastersPhotosService,
    MastersStatsService,
    MastersTariffService,
    PortfolioService,
    MastersAvailabilityService,
    MastersNotificationSettingsService,
    MastersScheduleService,
    MastersQuickRepliesService,
    MastersLandingStatsService,
    MastersAvailabilityFacade,
    MastersReferralsFacade,
    MastersCacheWarmingFacade,
  ],
  exports: [
    MastersService,
    MastersAvailabilityFacade,
    MastersReferralsFacade,
    MastersCacheWarmingFacade,
  ],
})
export class MastersModule {}
