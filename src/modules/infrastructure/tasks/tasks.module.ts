import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';
import { DigestModule } from '../../notifications/digest/digest.module';
import { EmailModule } from '../../email/email.module';
import { TasksTariffService } from './services/tasks-tariff.service';
import { TasksAnalyticsService } from './services/tasks-analytics.service';
import { TasksMaintenanceService } from './services/tasks-maintenance.service';
import { TasksActivityService } from './services/tasks-activity.service';
import { TasksBookingReminderService } from './services/tasks-booking-reminder.service';
import { TasksDigestService } from './services/tasks-digest.service';
import { TasksDripService } from './services/tasks-drip.service';
import { VerificationModule } from '../../verification/verification.module';

@Module({
  imports: [
    ScheduleModule,
    PrismaModule,
    RedisModule,
    NotificationsModule,
    DigestModule,
    EmailModule,
    VerificationModule,
  ],
  providers: [
    TasksService,
    TasksTariffService,
    TasksDripService,
    TasksAnalyticsService,
    TasksMaintenanceService,
    TasksActivityService,
    TasksBookingReminderService,
    TasksDigestService,
  ],
  exports: [TasksService, TasksActivityService],
})
export class TasksModule {}
