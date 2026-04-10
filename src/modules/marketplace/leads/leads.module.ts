import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsQueryController } from './leads-query.controller';
import { LeadsSubscriptionController } from './leads-subscription.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';
import { RecaptchaService } from '../../shared/utils/recaptcha.service';
import { LeadsValidationService } from './services/leads-validation.service';
import { LeadsSpamService } from './services/leads-spam.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { LeadsListService } from './services/leads-list.service';
import { LeadsQueryService } from './services/leads-query.service';
import { LeadsActionsService } from './services/leads-actions.service';
import { LeadsAvailabilitySubscriptionService } from './services/leads-availability-subscription.service';
import { LeadsClientDataService } from './services/leads-client-data.service';
import { LeadsCreateNotificationService } from './services/leads-create-notification.service';
import { LeadsConversationService } from './services/leads-conversation.service';
import { MasterAvailableListener } from './listeners/master-available.listener';
import { MastersModule } from '../masters/masters.module';
import { EmailModule } from '../../email/email.module';
import { ReferralsModule } from '../../engagement/referrals/referrals.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    MastersModule,
    EmailModule,
    ReferralsModule,
  ],
  controllers: [
    LeadsController,
    LeadsQueryController,
    LeadsSubscriptionController,
  ],
  providers: [
    LeadsService,
    RecaptchaService,
    LeadsValidationService,
    LeadsClientDataService,
    LeadsSpamService,
    LeadsAnalyticsService,
    LeadsListService,
    LeadsQueryService,
    LeadsActionsService,
    LeadsCreateNotificationService,
    LeadsConversationService,
    LeadsAvailabilitySubscriptionService,
    MasterAvailableListener,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
