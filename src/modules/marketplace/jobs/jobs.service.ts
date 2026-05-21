import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';

import { JobsQueryService } from './services/jobs-query.service';
import { JobsCommandService } from './services/jobs-command.service';
import { JobApplicationsService } from './services/job-applications.service';
import { JobsCacheService } from './services/jobs-cache.service';
import { JobDocumentsService } from './services/job-documents.service';
import { JobCompanyReviewsService } from './services/job-company-reviews.service';
import { CreateJobDocumentDto } from './dto/create-job-document.dto';
import { CreateJobReviewDto } from '../../companies/dto/create-job-review.dto';

/**
 * Facade pattern implementation for the Jobs Module.
 * Delegates all operations to granular domain services to respect SRP.
 */
@Injectable()
export class JobsService {
  constructor(
    private readonly jobsQuery: JobsQueryService,
    private readonly jobsCommand: JobsCommandService,
    private readonly jobApplications: JobApplicationsService,
    private readonly jobsCache: JobsCacheService,
    private readonly jobDocuments: JobDocumentsService,
    private readonly jobCompanyReviews: JobCompanyReviewsService,
  ) {}

  invalidateJobCaches(jobId?: string) {
    return this.jobsCache.invalidateJobCaches(jobId);
  }

  createJob(dto: CreateJobDto, user: JwtUser) {
    return this.jobsCommand.createJob(dto, user);
  }

  getJobs(dto: QueryJobsDto, user?: JwtUser) {
    return this.jobsQuery.getJobs(dto, user);
  }

  getJobById(jobId: string, user?: JwtUser) {
    return this.jobsQuery.getJobById(jobId, user);
  }

  getJobWithApplications(jobId: string, user: JwtUser) {
    return this.jobsQuery.getJobWithApplications(jobId, user);
  }

  getMyApplicationForJob(jobId: string, user: JwtUser) {
    return this.jobsQuery.getMyApplicationForJob(jobId, user);
  }

  applyToJob(jobId: string, dto: CreateJobApplicationDto, user: JwtUser) {
    return this.jobApplications.applyToJob(jobId, dto, user);
  }

  updateApplication(
    applicationId: string,
    dto: UpdateJobApplicationDto,
    user: JwtUser,
  ) {
    return this.jobApplications.updateApplication(applicationId, dto, user);
  }

  withdrawApplication(applicationId: string, user: JwtUser) {
    return this.jobApplications.withdrawApplication(applicationId, user);
  }

  viewApplication(applicationId: string, user: JwtUser) {
    return this.jobApplications.viewApplication(applicationId, user);
  }

  selectMaster(jobId: string, applicationId: string, user: JwtUser) {
    return this.jobApplications.selectMaster(jobId, applicationId, user);
  }

  rejectApplication(applicationId: string, user: JwtUser) {
    return this.jobApplications.rejectApplication(applicationId, user);
  }

  getMyApplications(user: JwtUser, page = 1, limit = 20) {
    return this.jobApplications.getMyApplications(user, page, limit);
  }

  closeJobDirect(jobId: string, user: JwtUser) {
    return this.jobsCommand.closeJobDirect(jobId, user);
  }

  requestCloseJob(jobId: string, user: JwtUser) {
    return this.jobsCommand.requestCloseJob(jobId, user);
  }

  confirmCloseJob(jobId: string, user: JwtUser) {
    return this.jobsCommand.confirmCloseJob(jobId, user);
  }

  rejectCloseJob(jobId: string, user: JwtUser) {
    return this.jobsCommand.rejectCloseJob(jobId, user);
  }

  // ---------- leaderboard ----------
  getJobLeaderboard(jobId: string) {
    return this.jobsQuery.getJobLeaderboard(jobId);
  }

  listJobDocuments(jobId: string, user: JwtUser) {
    return this.jobDocuments.listDocuments(jobId, user);
  }

  addJobDocument(jobId: string, dto: CreateJobDocumentDto, user: JwtUser) {
    return this.jobDocuments.addDocument(jobId, dto, user);
  }

  deleteJobDocument(documentId: string, user: JwtUser) {
    return this.jobDocuments.deleteDocument(documentId, user);
  }

  reviewCompanyForJob(jobId: string, dto: CreateJobReviewDto, user: JwtUser) {
    return this.jobCompanyReviews.createCompanyReview(user, jobId, dto);
  }
}
