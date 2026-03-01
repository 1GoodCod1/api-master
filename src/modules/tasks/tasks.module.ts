import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksTariffService } from './services/tasks-tariff.service';
import { TasksAnalyticsService } from './services/tasks-analytics.service';
import { TasksMaintenanceService } from './services/tasks-maintenance.service';
import { TasksActivityService } from './services/tasks-activity.service';
import { TasksBookingReminderService } from './services/tasks-booking-reminder.service';

@Module({
  imports: [ScheduleModule, PrismaModule, RedisModule, NotificationsModule],
  providers: [
    TasksService,
    TasksTariffService,
    TasksAnalyticsService,
    TasksMaintenanceService,
    TasksActivityService,
    TasksBookingReminderService,
  ],
  exports: [TasksService, TasksActivityService],
})
export class TasksModule {}
