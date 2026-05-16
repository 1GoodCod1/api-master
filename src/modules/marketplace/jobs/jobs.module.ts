import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { JointsModule } from '../joints/joints.module';
import { NotificationsModule } from '../../notifications/notifications/notifications.module';
import { JobsCacheService } from './services/jobs-cache.service';
import { JobsQueryService } from './services/jobs-query.service';
import { JobsCommandService } from './services/jobs-command.service';
import { JobApplicationsService } from './services/job-applications.service';

@Module({
  imports: [PrismaModule, JointsModule, NotificationsModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsCacheService,
    JobsQueryService,
    JobsCommandService,
    JobApplicationsService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
