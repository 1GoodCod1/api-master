import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { MastersModule } from '../masters/masters.module';

@Module({
  imports: [PrismaModule, NotificationsModule, MastersModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
