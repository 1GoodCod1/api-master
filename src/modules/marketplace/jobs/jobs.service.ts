import { Injectable } from '@nestjs/common';
import {
  JobStatus,
  JobType,
  JointsTransactionType,
  NotificationCategory,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { Cacheable } from '../../shared/cache/cacheable.decorator';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { createHash } from 'crypto';
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

const TOP_VISIBLE_RANK = 5;
const JOBS_LIST_TTL = 30;
const JOB_BY_ID_TTL = 60;
const LEADERBOARD_TTL = 15;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jointsService: JointsService,
    private readonly notificationEvents: NotificationEventEmitter,
    private readonly cache: CacheService,
  ) {}

  // ---------- cache helpers ----------

  /**
   * Ключ листинга — ОДИН сегмент после `cache:jobs:list:`, чтобы keyset
   * (имя — префикс без последнего сегмента) был общий для всех ключей.
   * Так инвалидация шаблона `cache:jobs:list:*` идёт через SADD-набор,
   * а не через SCAN.
   *
   * Анонимы и мастера видят одно и то же → один разделяемый ключ по фильтрам.
   * Клиенты видят только свои джобы → ключ персональный.
   */
  private jobsListKey(dto: QueryJobsDto, user?: JwtUser): string {
    const scope =
      user?.role === UserRole.CLIENT
        ? `client:${user.id}`
        : user?.role === UserRole.MASTER
          ? `master:${user.id}` // recommended использует master.cityId
          : 'public';
    const payload = JSON.stringify({ scope, dto: dto ?? {} });
    const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
    return `cache:jobs:list:${hash}`;
  }

  private jobByIdKey(jobId: string): string {
    return `cache:jobs:by-id:${jobId}`;
  }

  private leaderboardKey(jobId: string): string {
    return `cache:jobs:leaderboard:${jobId}`;
  }

  /**
   * Инвалидация по keyset — O(members), без SCAN.
   * Все три шаблона имеют ровно один сегмент после префикса
   * → keyset зарегистрирован под `keyset:cache:jobs:<bucket>:*`.
   */
  private async invalidateJobCaches(jobId?: string): Promise<void> {
    const tasks: Promise<unknown>[] = [
      this.cache.invalidate('cache:jobs:list:*'),
    ];
    if (jobId) {
      tasks.push(this.cache.del(this.jobByIdKey(jobId)));
      tasks.push(this.cache.del(this.leaderboardKey(jobId)));
    }
    await Promise.all(tasks);
  }

  // ---------- create ----------

  async createJob(dto: CreateJobDto, user: JwtUser) {
    const { photoFileIds, ...jobData } = dto;

    // Mutual exclusion: гарантия, что лишнее поле не сохраняется.
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

    await this.invalidateJobCaches();
    return job;
  }

  // ---------- queries ----------

  async getJobs(dto: QueryJobsDto, user?: JwtUser) {
    const key = this.jobsListKey(dto, user);
    return this.cache.getOrSet(
      key,
      () => this.getJobsRaw(dto, user),
      JOBS_LIST_TTL,
    );
  }

  private async getJobsRaw(dto: QueryJobsDto, user?: JwtUser) {
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

    const andClauses: Prisma.JobWhereInput[] = [];
    const where: Prisma.JobWhereInput = {};

    if (type) where.type = type;

    if (search?.trim()) {
      andClauses.push({
        OR: [
          { title: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    if (user?.role === UserRole.CLIENT) {
      where.clientId = user.id;
      if (status) where.status = status;
    } else if (user?.role === UserRole.MASTER) {
      // master видит только OPEN независимо от status в запросе
      where.status = JobStatus.OPEN;
    } else {
      // анонимный: только OPEN, не показываем закрытые/найденные
      where.status = JobStatus.OPEN;
    }

    if (cityId) where.cityId = cityId;

    if (recommended && user?.role === UserRole.MASTER) {
      const master = await this.prisma.master.findUnique({
        where: { userId: user.id },
        select: { cityId: true },
      });
      if (master?.cityId) {
        andClauses.push({
          OR: [{ cityId: master.cityId }, { cityId: null }],
        });
        delete where.cityId;
      }
    }

    if (andClauses.length > 0) where.AND = andClauses;

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

  async getJobById(jobId: string, user?: JwtUser) {
    const job = await this.cache.getOrSet(
      this.jobByIdKey(jobId),
      async () =>
        this.prisma.job.findUnique({
          where: { id: jobId },
          include: { ...JOB_INCLUDE_BASE, applications: false },
        }),
      JOB_BY_ID_TTL,
    );

    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    // Доступ: владелец видит всегда; остальные — только не-CLOSED.
    const isOwner = user?.id === job.clientId;
    if (!isOwner && job.status === JobStatus.CLOSED) {
      throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    }

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
      orderBy: [{ jointsSpent: 'desc' }, { createdAt: 'asc' }],
    });

    // Клиент видит всех — он владелец. Анонимизации здесь нет.
    const ranked = applications.map((app, index) => ({
      ...app,
      rank: index + 1,
      isAnonymous: false,
    }));

    return { job, applications: ranked };
  }

  /**
   * Есть ли у мастера активный отклик на конкретный job.
   * Лёгкий эндпоинт для UI (вместо подгрузки всех заявок мастера).
   */
  async getMyApplicationForJob(jobId: string, user: JwtUser) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const app = await this.prisma.jobApplication.findUnique({
      where: { jobId_masterId: { jobId, masterId: master.id } },
      select: {
        id: true,
        status: true,
        jointsSpent: true,
        createdAt: true,
        viewedAt: true,
      },
    });

    return { applied: !!app, application: app };
  }

  // ---------- apply / update / withdraw ----------

  async applyToJob(jobId: string, dto: CreateJobApplicationDto, user: JwtUser) {
    const masterProfile = await this.prisma.master.findUnique({
      where: { userId: user.id },
      include: { user: { select: { isBanned: true, isVerified: true } } },
    });
    if (!masterProfile)
      throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    if (masterProfile.user.isBanned || !masterProfile.user.isVerified)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.status !== JobStatus.OPEN)
      throw AppErrors.badRequest(AppErrorMessages.JOB_NOT_OPEN);

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_masterId: { jobId, masterId: masterProfile.id } },
      select: { id: true },
    });
    if (existing)
      throw AppErrors.conflict(AppErrorMessages.JOB_ALREADY_APPLIED);

    if (dto.jointsSpent < job.minJoints)
      throw AppErrors.badRequest(AppErrorMessages.JOB_APPLICATION_MIN_JOINTS);

    const { photoFileIds, milestones, ...appData } = dto;

    // Атомарно: списать joints, создать application, записать spend-транзакцию.
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

    this.notificationEvents.notify({
      userId: job.clientId,
      category: NotificationCategory.JOB_APPLICATION_RECEIVED,
      title: 'New application',
      message: `A master applied to your job: "${job.title}"`,
      metadata: { jobId, applicationId: application.id },
    });

    await this.invalidateJobCaches(jobId);
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
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.deadline !== undefined && { deadline: dto.deadline }),
          ...(dto.milestones !== undefined && { milestones }),
          ...(dto.jointsSpent !== undefined && {
            jointsSpent: dto.jointsSpent,
          }),
        },
        include: APPLICATION_INCLUDE,
      });
    });

    await this.invalidateJobCaches(application.jobId);
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
      // Сохранить аудит: отвязать transactions, прежде чем cascade удалит их.
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

    await this.invalidateJobCaches(application.jobId);
    return { success: true };
  }

  // ---------- client actions ----------

  async viewApplication(applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true, ...APPLICATION_INCLUDE },
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

      this.notificationEvents.notify({
        userId: application.master.userId,
        category: NotificationCategory.JOB_APPLICATION_VIEWED,
        title: 'Client viewed your application',
        message: `A client viewed your application for: "${application.job.title}"`,
        metadata: { jobId: application.jobId, applicationId },
      });
    }

    const rank = await this.getApplicationRank(
      application.jobId,
      applicationId,
    );

    // Клиент-владелец видит всех мастеров своих заявок.
    return { ...application, rank, isAnonymous: false };
  }

  async selectMaster(jobId: string, applicationId: string, user: JwtUser) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { master: { select: { id: true, userId: true } }, job: true },
    });
    if (!application || application.jobId !== jobId)
      throw AppErrors.notFound(AppErrorMessages.JOB_APPLICATION_NOT_FOUND);
    if (application.job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);

    // Атомарно: OPEN → FOUND, выбранная заявка SELECTED, все остальные PENDING → REJECTED.
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

    await this.invalidateJobCaches(jobId);
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
    if (application.job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLICATION_ACCESS_DENIED);
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

    await this.invalidateJobCaches(application.jobId);
    return { success: true };
  }

  // ---------- master apps ----------

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

    // Один SQL-запрос для рангов всех jobId сразу (вместо N+1).
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

  // ---------- close flow ----------

  async closeJobDirect(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, clientId: true, status: true, title: true },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    if (job.status !== JobStatus.OPEN) {
      throw AppErrors.badRequest(
        'Direct close only allowed for OPEN jobs without a selected master',
      );
    }

    // Клиент закрыл сам — рефанд joints всем PENDING-откликнувшимся.
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

    await this.invalidateJobCaches(jobId);
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
    if (job.clientId !== user.id)
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
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

    await this.invalidateJobCaches(jobId);
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

    // Закрыть диалог master↔client. Уникальный (masterId, clientId) — 1 запись.
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

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    await this.invalidateJobCaches(jobId);
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

    if (job.clientId) {
      this.notificationEvents.notify({
        userId: job.clientId,
        category: NotificationCategory.JOB_STATUS_CHANGED,
        title: 'Close request rejected',
        message: `The master rejected closing "${job.title}". Job is back to active.`,
        metadata: { jobId, status: 'FOUND' },
      });
    }

    const updated = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE_BASE,
    });
    await this.invalidateJobCaches(jobId);
    return updated;
  }

  // ---------- leaderboard ----------

  @Cacheable(
    (jobId: string) => `cache:jobs:leaderboard:${jobId}`,
    LEADERBOARD_TTL,
  )
  async getJobLeaderboard(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, minJoints: true, status: true },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

    const top = await this.prisma.jobApplication.findMany({
      where: { jobId, status: { not: 'REJECTED' } },
      orderBy: [{ jointsSpent: 'desc' }, { createdAt: 'asc' }],
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

  // ---------- helpers ----------

  /**
   * Точечный ранк одной заявки в рамках job через SQL.
   * O(1) по строкам результата вместо O(N) загрузки.
   */
  private async getApplicationRank(
    jobId: string,
    applicationId: string,
  ): Promise<number> {
    const target = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { jointsSpent: true, createdAt: true },
    });
    if (!target) return 0;

    const higher = await this.prisma.jobApplication.count({
      where: {
        jobId,
        OR: [
          { jointsSpent: { gt: target.jointsSpent } },
          {
            jointsSpent: target.jointsSpent,
            createdAt: { lt: target.createdAt },
          },
        ],
      },
    });
    return higher + 1;
  }

  /**
   * Должен ли мастер видеть профиль заявителя (анонимизация bottom-ranked).
   * Используется в UI; экспортирована как helper. См. TOP_VISIBLE_RANK.
   */
  static isApplicantVisible(rank: number): boolean {
    return rank <= TOP_VISIBLE_RANK;
  }
}
