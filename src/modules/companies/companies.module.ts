import { Module } from '@nestjs/common';
import { JobsModule } from '../marketplace/jobs/jobs.module';
import { ReviewsModule } from '../marketplace/reviews/reviews.module';
import { PrismaModule } from '../shared/database/prisma.module';
import { CompaniesController } from './companies.controller';
import { CompaniesPublicController } from './companies-public.controller';
import { CompaniesService } from './companies.service';
import { CompaniesAccessService } from './services/companies-access.service';
import { CompaniesBillingService } from './services/companies-billing.service';
import { CompaniesReviewsService } from './services/companies-reviews.service';
import { CompaniesSubscriptionService } from './services/companies-subscription.service';
import { CompanyGuard } from '../../common/guards';
import { CompanyPlansGuard } from './guards/company-plans.guard';
import { CompaniesCommandService } from './services/companies-command.service';
import { CompaniesProviderService } from './services/companies-provider.service';
import { CompaniesPublicService } from './services/companies-public.service';
import { CompaniesQueryService } from './services/companies-query.service';
import { CompaniesRequestsService } from './services/companies-requests.service';
import { CompaniesTeamService } from './services/companies-team.service';
import { CompaniesWorkspaceService } from './services/companies-workspace.service';

@Module({
  imports: [PrismaModule, JobsModule, ReviewsModule],
  controllers: [CompaniesController, CompaniesPublicController],
  providers: [
    CompaniesService,
    CompaniesAccessService,
    CompaniesCommandService,
    CompaniesProviderService,
    CompaniesPublicService,
    CompaniesQueryService,
    CompaniesRequestsService,
    CompaniesTeamService,
    CompaniesWorkspaceService,
    CompaniesBillingService,
    CompaniesReviewsService,
    CompaniesSubscriptionService,
    CompanyPlansGuard,
    CompanyGuard,
  ],
  exports: [CompaniesService, CompaniesSubscriptionService, CompanyPlansGuard],
})
export class CompaniesModule {}
