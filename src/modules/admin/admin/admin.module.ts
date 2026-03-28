import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { TasksModule } from '../../infrastructure/tasks/tasks.module';
import { FilesModule } from '../../infrastructure/files/files.module';
import { AdminUsersService } from './services/admin-users.service';
import { AdminMastersService } from './services/admin-masters.service';
import { AdminLeadsService } from './services/admin-leads.service';
import { AdminReviewsService } from './services/admin-reviews.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminSystemService } from './services/admin-system.service';
import { EmailTemplateOverrideRepository } from './services/email-template-override.repository';
import { AppSettingsModule } from '../../app-settings/app-settings.module';
import { DigestModule } from '../../notifications/digest/digest.module';
import { AuditModule } from '../../audit/audit.module';
import { ConsentModule } from '../../consent/consent.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CacheModule,
    TasksModule,
    FilesModule,
    AppSettingsModule,
    DigestModule,
    AuditModule,
    ConsentModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    EmailTemplateOverrideRepository,
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
