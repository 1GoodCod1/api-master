import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { CacheModule } from '../shared/cache/cache.module';
import { TasksModule } from '../tasks/tasks.module';
import { AdminUsersService } from './services/admin-users.service';
import { AdminMastersService } from './services/admin-masters.service';
import { AdminLeadsService } from './services/admin-leads.service';
import { AdminReviewsService } from './services/admin-reviews.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminSystemService } from './services/admin-system.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CacheModule,
    TasksModule,
    AppSettingsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminUsersService,
    AdminMastersService,
    AdminLeadsService,
    AdminReviewsService,
    AdminPaymentsService,
    AdminAuditService,
    AdminAnalyticsService,
    AdminSystemService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
