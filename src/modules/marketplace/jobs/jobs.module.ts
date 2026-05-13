import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { JointsModule } from '../joints/joints.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';

@Module({
  imports: [PrismaModule, JointsModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
