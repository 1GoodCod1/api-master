import { Injectable } from '@nestjs/common';
import {
  JobStatus,
  JointsTransactionType,
  NotificationCategory,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { CreateJobApplicationDto } from '../dto/create-job-application.dto';
import { UpdateJobApplicationDto } from '../dto/update-job-application.dto';
import { JobsCacheService } from './jobs-cache.service';
import { NotificationEventEmitter } from '../../../notifications/events';
import { JointsService } from '../../joints/joints.service';
import { JobsQueryService } from './jobs-query.service';
import { JobsAccessService } from './jobs-access.service';
import { JobLifecycleService } from './job-lifecycle.service';
import { APPLICATION_INCLUDE, JOB_INCLUDE_BASE } from '../jobs.constants';

@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsCache: JobsCacheService,
    private readonly notificationEvents: NotificationEventEmitter,
    private readonly jointsService: JointsService,
    private readonly jobsQuery: JobsQueryService,
    private readonly jobsAccess: JobsAccessService,
    private readonly jobLifecycle: JobLifecycleService,
  ) {}

  async applyToJob(jobId: string, dto: CreateJobApplicationDto, user: JwtUser) {
    const masterProfile = await this.prisma.master.findUnique({
      where: { userId: user.id },
      include: { user: { select: { isBanned: true, isVerified: true } } },
    });
    if (!masterProfile)
      throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    if (masterProfile.user.isBanned)
      throw AppErrors.forbidden(AppErrorMessages.AUTH_LOGIN_ACCOUNT_BANNED);
    if (!masterProfile.user.isVerified)
      throw AppErrors.forbidden(AppErrorMessages.GUARD_VERIFICATION_REQUIRED);

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        minJoints: true,
        clientId: true,
        companyId: true,
        selectedApplicationId: true,
      },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    await this.jobsAccess.assertCanApplyToJob(user.id, masterProfile.id, job);

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_masterId: { jobId, masterId: masterProfile.id } },
      select: { id: true },
    });
    if (existing)
      throw AppErrors.conflict(AppErrorMessages.JOB_ALREADY_APPLIED);

    if (dto.jointsSpent < job.minJoints)
      throw AppErrors.badRequest(AppErrorMessages.JOB_APPLICATION_MIN_JOINTS);

    const { photoFileIds, milestones, ...appData } = dto;

    const application = await this.prisma.$transaction(async (tx) => {
      await this.jointsService.spendJoints(
        masterProfile.id,
        dto.jointsSpent,
        `Application for job: ${job.title}`,
        undefined,
        tx,
      );

      const created = await tx.jobApplication.create({
        data: {
          ...appData,
          milestones: milestones ? (milestones as object[]) : undefined,
          jobId,
          masterId: masterProfile.id,
          photos: photoFileIds?.length
            ? {
                create: photoFileIds.map((fileId, order) => ({
                  order,
                  file: { connect: { id: fileId } },
                })),
              }
            : undefined,
        },
        include: APPLICATION_INCLUDE,
      });

      await this.jointsService.recordApplicationId(
        masterProfile.id,
        created.id,
        dto.jointsSpent,
        tx,
      );

      return created;
    });

    await this.jobLifecycle.notifyStakeholders({
      job: {
        id: job.id,
        title: job.title,
        clientId: job.clientId,
        companyId: job.companyId,
        status: job.status,
        selectedApplicationId: job.selectedApplicationId,
      },
      category: NotificationCategory.JOB_APPLICATION_RECEIVED,
      title: 'New application',
      message: `A master applied to your job: "${job.title}"`,
      metadata: { applicationId: application.id },
      excludeUserIds: [user.id],
    });

    await this.jobsCache.invalidateJobCaches(jobId);
    return application;
  }

  async updateApplication(
    applicationId: string,
    dto: UpdateJobApplicationDto,
    user: JwtUser,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    if (application.masterId !== master.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLICATION_ACCESS_DENIED);
    if (application.status !== 'PENDING')
      throw AppErrors.badRequest('Can only edit pending applications');
    if (application.viewedAt && dto.description !== undefined)
      throw AppErrors.badRequest(
        'Cannot edit description after client viewed your application',
      );

    let boostDelta = 0;
    if (dto.jointsSpent !== undefined) {
      if (dto.jointsSpent <= application.jointsSpent) {
        throw AppErrors.badRequest('Boost must be higher than current bid');
      }
      boostDelta = dto.jointsSpent - application.jointsSpent;
    }

    const milestones = dto.milestones as object[] | undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (boostDelta > 0) {
        await this.jointsService.spendJoints(
          master.id,
          boostDelta,
          `Boost application for job`,
          application.id,
          tx,
        );
        await tx.jointsTransaction.create({
          data: {
            masterId: master.id,
            amount: -boostDelta,
            type: JointsTransactionType.APPLICATION_SPEND,
            description: `Boost for job application`,
            applicationId: application.id,
          },
        });
      }

      return tx.jobApplication.update({
        where: { id: applicationId },
        data: {
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.deadline !== undefined && { deadline: dto.deadline }),
          ...(dto.milestones !== undefined && { milestones }),
          ...(dto.jointsSpent !== undefined && {
            jointsSpent: dto.jointsSpent,
          }),
        },
        include: APPLICATION_INCLUDE,
      });
    });

    await this.jobsCache.invalidateJobCaches(application.jobId);
    return updated;
  }

  async withdrawApplication(applicationId: string, user: JwtUser) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { select: { title: true, id: true } } },
    });

    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    if (application.masterId !== master.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLICATION_ACCESS_DENIED);
    if (application.status !== 'PENDING')
      throw AppErrors.badRequest('Can only withdraw pending applications');
    if (application.viewedAt)
      throw AppErrors.badRequest(
        'Cannot withdraw after client viewed your application',
      );

    await this.prisma.$transaction([
      this.prisma.jointsTransaction.updateMany({
        where: { applicationId },
        data: { applicationId: null },
      }),
      this.prisma.jobApplication.delete({ where: { id: applicationId } }),
      this.prisma.master.update({
        where: { id: master.id },
        data: { jointsBalance: { increment: application.jointsSpent } },
      }),
      this.prisma.jointsTransaction.create({
        data: {
          masterId: master.id,
          amount: application.jointsSpent,
          type: JointsTransactionType.REFUND,
          description: `Withdrawn from job: "${application.job.title}"`,
        },
      }),
    ]);

    await this.jobsCache.invalidateJobCaches(application.jobId);
    return { success: true };
  }

  async viewApplication(applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true, ...APPLICATION_INCLUDE },
    });

    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(
      user.id,
      application.job,
    );

    if (!application.viewedAt) {
      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { viewedAt: new Date() },
      });

      this.notificationEvents.notify({
        userId: application.master.userId,
        category: NotificationCategory.JOB_APPLICATION_VIEWED,
        title: 'Client viewed your application',
        message: `A client viewed your application for: "${application.job.title}"`,
        metadata: { jobId: application.jobId, applicationId },
      });
    }

    const rank = await this.jobsQuery.getApplicationRank(
      application.jobId,
      applicationId,
    );

    return { ...application, rank, isAnonymous: false };
  }

  async selectMaster(jobId: string, applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { master: { select: { id: true, userId: true } }, job: true },
    });
    if (application?.jobId !== jobId)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(
      user.id,
      application.job,
    );

    const losers = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.job.updateMany({
        where: { id: jobId, status: JobStatus.OPEN },
        data: { status: JobStatus.FOUND, selectedApplicationId: applicationId },
      });
      if (claimed.count === 0) {
        throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);
      }

      await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'SELECTED' },
      });

      const losersList = await tx.jobApplication.findMany({
        where: { jobId, id: { not: applicationId }, status: 'PENDING' },
        select: { id: true, master: { select: { userId: true } } },
      });
      if (losersList.length > 0) {
        await tx.jobApplication.updateMany({
          where: { jobId, id: { not: applicationId }, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
      }
      return losersList;
    });

    this.notificationEvents.notify({
      userId: application.master.userId,
      category: NotificationCategory.JOB_MASTER_SELECTED,
      title: 'You were selected!',
      message: `A client selected you for their job: "${application.job.title}"`,
      metadata: { jobId, applicationId },
    });

    for (const l of losers) {
      this.notificationEvents.notify({
        userId: l.master.userId,
        category: NotificationCategory.JOB_NOT_SELECTED,
        title: 'Application not selected',
        message: `Your application for "${application.job.title}" was not selected`,
        metadata: { jobId, applicationId: l.id },
      });
    }

    await this.jobLifecycle.notifyStakeholders({
      job: {
        id: application.job.id,
        title: application.job.title,
        clientId: application.job.clientId,
        companyId: application.job.companyId,
        status: JobStatus.FOUND,
        selectedApplicationId: applicationId,
      },
      category: NotificationCategory.JOB_STATUS_CHANGED,
      title: 'Master selected',
      message: `A master was selected for "${application.job.title}"`,
      metadata: { applicationId, status: 'FOUND' },
      excludeUserIds: [application.master.userId, user.id],
    });

    await this.jobsCache.invalidateJobCaches(jobId);
    return {
      success: true,
      masterId: application.master.id,
      masterUserId: application.master.userId,
    };
  }

  async rejectApplication(applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true, master: { select: { userId: true } } },
    });

    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(
      user.id,
      application.job,
    );
    if (application.job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED' },
    });

    this.notificationEvents.notify({
      userId: application.master.userId,
      category: NotificationCategory.JOB_NOT_SELECTED,
      title: 'Application rejected',
      message: `Your application for "${application.job.title}" was not selected`,
      metadata: { jobId: application.jobId, applicationId },
    });

    await this.jobsCache.invalidateJobCaches(application.jobId);
    return { success: true };
  }

  async getMyApplications(user: JwtUser, page = 1, limit = 20) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobApplication.findMany({
        where: { masterId: master.id },
        include: {
          job: { include: JOB_INCLUDE_BASE },
          photos: { include: { file: true }, orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jobApplication.count({ where: { masterId: master.id } }),
    ]);

    if (items.length === 0) return { items: [], total, page, limit };

    const jobIds = Array.from(new Set(items.map((i) => i.jobId)));
    const ids = items.map((i) => i.id);

    const ranks = await this.prisma.$queryRaw<
      { id: string; rank: number }[]
    >(Prisma.sql`
      SELECT id, rank::int AS rank
      FROM (
        SELECT
          id,
          RANK() OVER (PARTITION BY "jobId" ORDER BY "jointsSpent" DESC, "createdAt" ASC) AS rank
        FROM "job_applications"
        WHERE "jobId" IN (${Prisma.join(jobIds)})
      ) t
      WHERE id IN (${Prisma.join(ids)})
    `);
    const rankById = new Map(ranks.map((r) => [r.id, r.rank]));

    const itemsWithRank = items.map((item) => ({
      ...item,
      rank: rankById.get(item.id) ?? 0,
    }));

    return { items: itemsWithRank, total, page, limit };
  }
}
