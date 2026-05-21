import { Injectable } from '@nestjs/common';
import {
  JobStatus,
  JobType,
  JointsTransactionType,
  NotificationCategory,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { CreateJobDto } from '../dto/create-job.dto';
import { JobsCacheService } from './jobs-cache.service';
import { JobsAccessService } from './jobs-access.service';
import { JobLifecycleService } from './job-lifecycle.service';
import { NotificationEventEmitter } from '../../../notifications/events';
import { JOB_INCLUDE_BASE } from '../jobs.constants';

@Injectable()
export class JobsCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsCache: JobsCacheService,
    private readonly notificationEvents: NotificationEventEmitter,
    private readonly jobsAccess: JobsAccessService,
    private readonly jobLifecycle: JobLifecycleService,
  ) {}

  async createJob(dto: CreateJobDto, user: JwtUser) {
    const { photoFileIds, ...jobData } = dto;

    if (jobData.type === JobType.FIXED_PRICE) {
      jobData.hourlyRate = undefined;
    } else if (jobData.type === JobType.HOURLY) {
      jobData.budget = undefined;
    }

    const job = await this.prisma.job.create({
      data: {
        ...jobData,
        clientId: user.id,
        photos: photoFileIds?.length
          ? {
              create: photoFileIds.map((fileId, order) => ({
                order,
                file: { connect: { id: fileId } },
              })),
            }
          : undefined,
      },
      include: JOB_INCLUDE_BASE,
    });

    await this.jobsCache.invalidateJobCaches();
    return job;
  }

  async closeJobDirect(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        clientId: true,
        companyId: true,
        status: true,
        title: true,
      },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(user.id, job);
    if (job.status !== JobStatus.OPEN) {
      throw AppErrors.badRequest(
        'Direct close only allowed for OPEN jobs without a selected master',
      );
    }

    const pending = await this.prisma.jobApplication.findMany({
      where: { jobId, status: 'PENDING' },
      select: { id: true, masterId: true, jointsSpent: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.job.updateMany({
        where: { id: jobId, status: JobStatus.OPEN },
        data: { status: JobStatus.CLOSED },
      });
      if (claimed.count === 0) {
        throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);
      }

      for (const a of pending) {
        await tx.master.update({
          where: { id: a.masterId },
          data: { jointsBalance: { increment: a.jointsSpent } },
        });
        await tx.jointsTransaction.create({
          data: {
            masterId: a.masterId,
            amount: a.jointsSpent,
            type: JointsTransactionType.REFUND,
            description: `Refund: client closed job "${job.title}"`,
            applicationId: a.id,
          },
        });
      }

      if (pending.length > 0) {
        await tx.jobApplication.updateMany({
          where: { jobId, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
      }
    });

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });

    await this.jobsCache.invalidateJobCaches(jobId);
    return updated;
  }

  async requestCloseJob(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        selectedApplication: {
          select: { master: { select: { id: true, userId: true } } },
        },
      },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(user.id, job);
    if (job.status !== JobStatus.FOUND) {
      throw AppErrors.badRequest(
        'Can only request close for jobs with a selected master',
      );
    }

    const claimed = await this.prisma.job.updateMany({
      where: { id: jobId, status: JobStatus.FOUND },
      data: { status: JobStatus.PENDING_CLOSE },
    });
    if (claimed.count === 0) {
      throw AppErrors.badRequest('Job status changed, please retry');
    }

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });

    const masterUserId = job.selectedApplication?.master?.userId;
    if (masterUserId) {
      this.notificationEvents.notify({
        userId: masterUserId,
        category: NotificationCategory.JOB_STATUS_CHANGED,
        title: 'Client wants to close the job',
        message: `The client is requesting to close "${job.title}". Please confirm or reject.`,
        metadata: { jobId, status: 'PENDING_CLOSE' },
      });
    }

    await this.jobLifecycle.notifyStakeholders({
      job: {
        id: job.id,
        title: job.title,
        clientId: job.clientId,
        companyId: job.companyId,
        status: JobStatus.PENDING_CLOSE,
        selectedApplicationId: job.selectedApplicationId,
      },
      category: NotificationCategory.JOB_STATUS_CHANGED,
      title: 'Close requested',
      message: `Close was requested for "${job.title}". Waiting for master confirmation.`,
      metadata: { status: 'PENDING_CLOSE' },
      excludeUserIds: masterUserId ? [masterUserId] : undefined,
    });

    await this.jobsCache.invalidateJobCaches(jobId);
    return updated;
  }

  async confirmCloseJob(jobId: string, user: JwtUser) {
    const masterProfile = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!masterProfile) {
      throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    if (job.status === JobStatus.CLOSED) return job;
    if (job.status !== JobStatus.PENDING_CLOSE)
      throw AppErrors.badRequest('Job is not pending close');

    const app = await this.prisma.jobApplication.findFirst({
      where: { jobId, masterId: masterProfile.id, status: 'SELECTED' },
      select: { id: true },
    });
    if (!app) throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const claimed = await this.prisma.job.updateMany({
      where: { id: jobId, status: JobStatus.PENDING_CLOSE },
      data: { status: JobStatus.CLOSED },
    });
    if (claimed.count === 0) {
      throw AppErrors.badRequest('Job status changed, please retry');
    }

    // Conversation is shared per (master, client) pair, not per job.
    // Only close the chat if there are no other ongoing jobs between them.
    const otherActiveJobs = await this.prisma.job.count({
      where: {
        clientId: job.clientId,
        id: { not: jobId },
        status: { in: [JobStatus.FOUND, JobStatus.PENDING_CLOSE] },
        selectedApplication: { masterId: masterProfile.id },
      },
    });
    if (otherActiveJobs === 0) {
      await this.prisma.conversation.updateMany({
        where: {
          masterId: masterProfile.id,
          clientId: job.clientId,
          closedAt: null,
        },
        data: { closedAt: new Date() },
      });
    }

    if (job.clientId) {
      await this.jobLifecycle.notifyStakeholders({
        job: {
          id: job.id,
          title: job.title,
          clientId: job.clientId,
          companyId: job.companyId,
          status: JobStatus.CLOSED,
          selectedApplicationId: job.selectedApplicationId,
        },
        category: NotificationCategory.JOB_STATUS_CHANGED,
        title: 'Job closed',
        message: `The master confirmed closing "${job.title}"`,
        metadata: { status: 'CLOSED' },
        excludeUserIds: [user.id],
      });
    }

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    await this.jobsCache.invalidateJobCaches(jobId);
    return updated;
  }

  async rejectCloseJob(jobId: string, user: JwtUser) {
    const masterProfile = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!masterProfile) {
      throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    if (job.status === JobStatus.FOUND || job.status === JobStatus.CLOSED)
      return job;
    if (job.status !== JobStatus.PENDING_CLOSE)
      throw AppErrors.badRequest('Job is not pending close');

    const app = await this.prisma.jobApplication.findFirst({
      where: { jobId, masterId: masterProfile.id, status: 'SELECTED' },
      select: { id: true },
    });
    if (!app) throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const claimed = await this.prisma.job.updateMany({
      where: { id: jobId, status: JobStatus.PENDING_CLOSE },
      data: { status: JobStatus.FOUND },
    });
    if (claimed.count === 0) {
      throw AppErrors.badRequest('Job status changed, please retry');
    }

    await this.jobLifecycle.notifyStakeholders({
      job: {
        id: job.id,
        title: job.title,
        clientId: job.clientId,
        companyId: job.companyId,
        status: JobStatus.FOUND,
        selectedApplicationId: job.selectedApplicationId,
      },
      category: NotificationCategory.JOB_STATUS_CHANGED,
      title: 'Close request rejected',
      message: `The master rejected closing "${job.title}". Job is back to active.`,
      metadata: { status: 'FOUND' },
      excludeUserIds: [user.id],
    });

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    await this.jobsCache.invalidateJobCaches(jobId);
    return updated;
  }
}
