import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecaptchaService } from '../shared/utils/recaptcha.service';
import { LeadsValidationService } from './services/leads-validation.service';
import { LeadsSpamService } from './services/leads-spam.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { LeadsQueryService } from './services/leads-query.service';
import { LeadsActionsService } from './services/leads-actions.service';
import { MasterAvailableListener } from './listeners/master-available.listener';

import { MastersModule } from '../masters/masters.module';
import { EmailModule } from '../email/email.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    MastersModule,
    EmailModule,
    ReferralsModule,
  ],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    RecaptchaService,
    LeadsValidationService,
    LeadsSpamService,
    LeadsAnalyticsService,
    LeadsQueryService,
    LeadsActionsService,
    MasterAvailableListener,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
