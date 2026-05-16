import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { QueryJobsDto } from '../dto/query-jobs.dto';
import { JobsCacheService } from './jobs-cache.service';
import { JOB_INCLUDE_BASE, APPLICATION_INCLUDE, JOBS_LIST_TTL, JOB_BY_ID_TTL, LEADERBOARD_TTL, TOP_VISIBLE_RANK } from '../jobs.constants';
import { Cacheable } from '../../../shared/cache/cacheable.decorator';

@Injectable()
export class JobsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly jobsCache: JobsCacheService,
  ) {}

  async getJobs(dto: QueryJobsDto, user?: JwtUser) {
    const key = this.jobsCache.jobsListKey(dto, user);
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
      mine,
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

    if (user?.role === UserRole.CLIENT && mine) {
      where.clientId = user.id;
      if (status) where.status = status;
    } else if (user?.role === UserRole.MASTER) {
      where.status = JobStatus.OPEN;
    } else {
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

    if (sort === 'best' && user?.role === UserRole.MASTER) {
      const master = await this.prisma.master.findUnique({
        where: { userId: user.id },
        select: { categoryId: true, cityId: true },
      });
      const masterCategoryId = master?.categoryId ?? null;
      const masterCityId = master?.cityId ?? null;

      const trimmedSearch = search?.trim() ?? '';
      const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : null;

      const filters: Prisma.Sql[] = [Prisma.sql`status = 'OPEN'::"JobStatus"`];
      if (type) filters.push(Prisma.sql`type = ${type}::"JobType"`);
      if (cityId) filters.push(Prisma.sql`"cityId" = ${cityId}`);
      if (searchPattern)
        filters.push(
          Prisma.sql`(title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`,
        );
      const whereSql = Prisma.join(filters, ' AND ');

      const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM jobs
        WHERE ${whereSql}
        ORDER BY
          CASE WHEN "categoryId" = ${masterCategoryId} THEN 0 ELSE 1 END,
          CASE WHEN "cityId" = ${masterCityId} OR "cityId" IS NULL THEN 0 ELSE 1 END,
          "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `);
      const orderedIds = rows.map((r) => r.id);

      const [unordered, total] = await this.prisma.$transaction([
        this.prisma.job.findMany({
          where: { id: { in: orderedIds } },
          include: JOB_INCLUDE_BASE,
        }),
        this.prisma.job.count({ where }),
      ]);
      const byId = new Map(unordered.map((j) => [j.id, j]));
      const items = orderedIds
        .map((id) => byId.get(id))
        .filter((j): j is NonNullable<typeof j> => Boolean(j));

      return { items, total, page, limit };
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

  async getJobById(jobId: string, user?: JwtUser) {
    const job = await this.cache.getOrSet(
      this.jobsCache.jobByIdKey(jobId),
      async () =>
        this.prisma.job.findUnique({
          where: { id: jobId },
          include: { ...JOB_INCLUDE_BASE, applications: false },
        }),
      JOB_BY_ID_TTL,
    );

    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);

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

    const ranked = applications.map((app, index) => ({
      ...app,
      rank: index + 1,
      isAnonymous: false,
    }));

    return { job, applications: ranked };
  }

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

  async getApplicationRank(jobId: string, applicationId: string): Promise<number> {
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

  static isApplicantVisible(rank: number): boolean {
    return rank <= TOP_VISIBLE_RANK;
  }
}
