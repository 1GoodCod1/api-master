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
import { JobsAccessService } from './services/jobs-access.service';
import { JobDocumentsService } from './services/job-documents.service';
import { JobCompanyReviewsService } from './services/job-company-reviews.service';
import { JobLifecycleService } from './services/job-lifecycle.service';

@Module({
  imports: [PrismaModule, JointsModule, NotificationsModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsAccessService,
    JobsCacheService,
    JobsQueryService,
    JobsCommandService,
    JobApplicationsService,
    JobLifecycleService,
    JobDocumentsService,
    JobCompanyReviewsService,
  ],
  exports: [JobsService, JobsCacheService],
})
export class JobsModule {}
