import { Injectable } from '@nestjs/common';
import { JobStatus, NotificationCategory, UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { JointsService } from '../joints/joints.service';
import { NotificationEventEmitter } from '../../notifications/events';

const JOB_INCLUDE_BASE = {
  photos: { include: { file: true }, orderBy: { order: 'asc' as const } },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarFile: { select: { path: true } },
    },
  },
  city: { select: { id: true, name: true } },
  _count: { select: { applications: true } },
} as const;

const APPLICATION_INCLUDE = {
  photos: { include: { file: true }, orderBy: { order: 'asc' as const } },
  master: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarFile: { select: { path: true } },
        },
      },
      city: true,
      category: true,
    },
  },
} as const;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jointsService: JointsService,
    private readonly notificationEvents: NotificationEventEmitter,
  ) {}

  async createJob(dto: CreateJobDto, user: JwtUser) {
    const { photoFileIds, ...jobData } = dto;

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

    return job;
  }

  async getJobs(dto: QueryJobsDto, user?: JwtUser) {
    const {
      status,
      type,
      cityId,
      recommended,
      page = 1,
      limit = 20,
      search,
      sort,
    } = dto;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (user?.role === UserRole.CLIENT) {
      where.clientId = user.id;
    } else if (user?.role === UserRole.MASTER) {
      where.status = JobStatus.OPEN;
    }
    // unauthenticated: no status restriction — show all jobs for public browsing

    if (cityId) {
      where.cityId = cityId;
    }

    // Recommended: jobs in master's city OR jobs with no city (any location)
    if (recommended && user?.role === UserRole.MASTER) {
      const master = await this.prisma.master.findUnique({
        where: { userId: user.id },
        select: { cityId: true },
      });
      if (master?.cityId) {
        where.OR = [{ cityId: master.cityId }, { cityId: null }];
        delete where.cityId;
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: JOB_INCLUDE_BASE,
        orderBy:
          sort === 'best'
            ? [{ applications: { _count: 'desc' } }, { createdAt: 'desc' }]
            : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getJobById(jobId: string, _user?: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        ...JOB_INCLUDE_BASE,
        applications: false,
      },
    });

    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    return job;
  }

  async getJobWithApplications(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });

    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const applications = await this.prisma.jobApplication.findMany({
      where: { jobId },
      include: APPLICATION_INCLUDE,
      orderBy: { jointsSpent: 'desc' },
    });

    const ranked = applications.map((app, index) => ({
      ...app,
      rank: index + 1,
      isAnonymous: false,
    }));

    return { job, applications: ranked };
  }

  async applyToJob(jobId: string, dto: CreateJobApplicationDto, user: JwtUser) {
    const masterProfile = await this.prisma.master.findUnique({
      where: { userId: user.id },
    });
    if (!masterProfile)
      throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_masterId: { jobId, masterId: masterProfile.id } },
    });
    if (existing)
      throw AppErrors.conflict(AppErrorMessages.JOB_ALREADY_APPLIED);

    if (dto.jointsSpent < job.minJoints)
      throw AppErrors.badRequest(AppErrorMessages.JOB_APPLICATION_MIN_JOINTS);

    await this.jointsService.spendJoints(
      masterProfile.id,
      dto.jointsSpent,
      `Application for job: ${job.title}`,
      undefined,
    );

    const { photoFileIds, milestones, ...appData } = dto;

    const application = await this.prisma.jobApplication.create({
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
      application.id,
      dto.jointsSpent,
    );

    const jobClientId: string = job.clientId;
    const jobTitle: string = job.title;
    this.notificationEvents.notify({
      userId: jobClientId,
      category: NotificationCategory.JOB_APPLICATION_RECEIVED,
      title: 'New application',
      message: `A master applied to your job: "${jobTitle}"`,
      metadata: { jobId, applicationId: application.id },
    });

    return application;
  }

  async viewApplication(applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        ...APPLICATION_INCLUDE,
      },
    });

    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    if (application.job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLICATION_ACCESS_DENIED);

    if (!application.viewedAt) {
      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { viewedAt: new Date() },
      });

      const masterUserId = String(application.master.userId);

      const appJobTitle = String(
        (application as Record<string, unknown>)['job']
          ? ((application as { job?: { title?: string } }).job?.title ?? '')
          : '',
      );
      this.notificationEvents.notify({
        userId: masterUserId,
        category: NotificationCategory.JOB_APPLICATION_VIEWED,
        title: 'Client viewed your application',
        message: `A client viewed your application for: "${appJobTitle}"`,
        metadata: { jobId: application.jobId, applicationId },
      });
    }

    const rank = await this.getApplicationRank(
      application.jobId,
      applicationId,
    );

    return {
      ...application,
      rank,
      master: rank <= 5 ? null : application.master,
    };
  }

  async selectMaster(jobId: string, applicationId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { _count: { select: { applications: true } } },
    });

    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    if (job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { master: true },
    });

    if (application?.jobId !== jobId)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.FOUND, selectedApplicationId: applicationId },
      }),
      this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: 'SELECTED' },
      }),
      // Joints are burned when master is selected — no refund
    ]);

    this.notificationEvents.notify({
      userId: application.master.userId,
      category: NotificationCategory.JOB_MASTER_SELECTED,
      title: 'You were selected!',
      message: `A client selected you for their job: "${job.title}"`,
      metadata: { jobId, applicationId },
    });

    return {
      success: true,
      masterId: application.master.id,
      masterUserId: application.master.userId,
    };
  }

  async getMyApplications(user: JwtUser, page = 1, limit = 20) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
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

    const itemsWithRank = await Promise.all(
      items.map(async (item) => ({
        ...item,
        rank: await this.getApplicationRank(item.jobId, item.id),
      })),
    );

    return { items: itemsWithRank, total, page, limit };
  }

  async rejectApplication(applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true, master: { include: { user: true } } },
    });

    if (!application)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    if (application.job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLICATION_ACCESS_DENIED);
    if (application.job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED' },
    });

    if (application.master?.user) {
      this.notificationEvents.notify({
        userId: application.master.user.id,
        category: NotificationCategory.JOB_APPLICATION_VIEWED,
        title: 'Application rejected',
        message: `Your application for "${application.job.title}" was not selected`,
        metadata: { jobId: application.jobId, applicationId },
      });
    }

    return { success: true };
  }

  async withdrawApplication(applicationId: string, user: JwtUser) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
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
      this.prisma.jobApplication.delete({ where: { id: applicationId } }),
      this.prisma.master.update({
        where: { id: master.id },
        data: { jointsBalance: { increment: application.jointsSpent } },
      }),
      this.prisma.jointsTransaction.create({
        data: {
          masterId: master.id,
          amount: application.jointsSpent,
          type: 'REFUND',
          description: `Withdrawn from job: "${application.job.title}"`,
        },
      }),
    ]);

    return { success: true };
  }

  async updateApplication(
    applicationId: string,
    dto: UpdateJobApplicationDto,
    user: JwtUser,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
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

    if (dto.jointsSpent !== undefined) {
      if (dto.jointsSpent <= application.jointsSpent) {
        throw AppErrors.badRequest('Boost must be higher than current bid');
      }
      await this.jointsService.spendJoints(
        master.id,
        dto.jointsSpent - application.jointsSpent,
        `Boost application for job`,
        application.id,
      );
    }

    const milestones = dto.milestones as object[];

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline }),
        ...(dto.milestones !== undefined && { milestones }),
        ...(dto.jointsSpent !== undefined && { jointsSpent: dto.jointsSpent }),
      },
      include: APPLICATION_INCLUDE,
    });
  }

  async closeJobDirect(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    if (job.status !== JobStatus.OPEN) {
      throw AppErrors.badRequest(
        'Direct close only allowed for OPEN jobs without a selected master',
      );
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CLOSED },
      include: JOB_INCLUDE_BASE,
    });
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
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    if (job.status !== JobStatus.FOUND) {
      throw AppErrors.badRequest(
        'Can only request close for jobs with a selected master',
      );
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING_CLOSE' as JobStatus },
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

    // Already closed (e.g. client used direct-close) — idempotent
    if (job.status === JobStatus.CLOSED) return job;

    if (job.status !== ('PENDING_CLOSE' as JobStatus))
      throw AppErrors.badRequest('Job is not pending close');

    const app = await this.prisma.jobApplication.findFirst({
      where: { jobId, masterId: masterProfile.id, status: 'SELECTED' },
    });
    if (!app) throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CLOSED },
      include: JOB_INCLUDE_BASE,
    });

    // Close the job conversation so chat input is blocked for both parties
    await this.prisma.conversation.updateMany({
      where: {
        masterId: masterProfile.id,
        clientId: job.clientId,
        closedAt: null,
      },
      data: { closedAt: new Date() },
    });

    if (job.clientId) {
      this.notificationEvents.notify({
        userId: job.clientId,
        category: NotificationCategory.JOB_STATUS_CHANGED,
        title: 'Job closed',
        message: `The master confirmed closing "${job.title}"`,
        metadata: { jobId, status: 'CLOSED' },
      });
    }

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

    // Already reverted or closed — idempotent
    if (job.status === JobStatus.FOUND || job.status === JobStatus.CLOSED)
      return job;

    if (job.status !== ('PENDING_CLOSE' as JobStatus))
      throw AppErrors.badRequest('Job is not pending close');

    const app = await this.prisma.jobApplication.findFirst({
      where: { jobId, masterId: masterProfile.id, status: 'SELECTED' },
    });
    if (!app) throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.FOUND },
      include: JOB_INCLUDE_BASE,
    });

    if (job.clientId) {
      this.notificationEvents.notify({
        userId: job.clientId,
        category: NotificationCategory.JOB_STATUS_CHANGED,
        title: 'Close request rejected',
        message: `The master rejected closing "${job.title}". Job is back to active.`,
        metadata: { jobId, status: 'FOUND' },
      });
    }

    return updated;
  }

  async getJobLeaderboard(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, minJoints: true },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    const top = await this.prisma.jobApplication.findMany({
      where: { jobId, status: { not: 'REJECTED' } },
      orderBy: { jointsSpent: 'desc' },
      take: 10,
      select: { jointsSpent: true, createdAt: true },
    });

    return {
      minJoints: job.minJoints,
      leaderboard: top.map((entry, i) => ({
        rank: i + 1,
        jointsSpent: entry.jointsSpent,
        timeAgo: entry.createdAt,
      })),
    };
  }

  private async getApplicationRank(
    jobId: string,
    applicationId: string,
  ): Promise<number> {
    const apps = await this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { jointsSpent: 'desc' },
      select: { id: true },
    });

    const idx = apps.findIndex((a) => a.id === applicationId);
    return idx + 1;
  }
}
