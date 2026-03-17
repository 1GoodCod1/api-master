import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsQueryService } from './services/bookings-query.service';
import { BookingsActionService } from './services/bookings-action.service';
import { BookingsValidationService } from './services/bookings-validation.service';
import { BookingsLeadSyncService } from './services/bookings-lead-sync.service';
import { BookingsNotificationService } from './services/bookings-notification.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MastersModule } from '../masters/masters.module';

@Module({
  imports: [PrismaModule, NotificationsModule, MastersModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingsQueryService,
    BookingsActionService,
    BookingsValidationService,
    BookingsLeadSyncService,
    BookingsNotificationService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
