import { Injectable } from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { JOB_INCLUDE_BASE } from '../../marketplace/jobs/jobs.constants';
import { JobsCacheService } from '../../marketplace/jobs/services/jobs-cache.service';
import type {
  CompanyJobListResponse,
  CompanyJobPayload,
} from '../companies.types';
import { CreateCompanyRequestDto } from '../dto/create-company-request.dto';
import { QueryCompanyRequestsDto } from '../dto/query-company-requests.dto';
import { UpdateCompanyRequestDto } from '../dto/update-company-request.dto';
import { CompaniesAccessService } from './companies-access.service';

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  JobStatus.OPEN,
  JobStatus.FOUND,
  JobStatus.PENDING_CLOSE,
];

@Injectable()
export class CompaniesRequestsService {
  constructor(
    private readonly access: CompaniesAccessService,
    private readonly jobsCache: JobsCacheService,
  ) {}

  createRequest(
    user: JwtUser,
    dto: CreateCompanyRequestDto,
  ): Promise<CompanyJobPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCustomerWorkspace(company);
        this.access.assertCanCreateRequest(membership);

        const { photoFileIds, ...jobData } = dto;

        if (jobData.type === JobType.FIXED_PRICE) {
          jobData.hourlyRate = undefined;
        } else if (jobData.type === JobType.HOURLY) {
          jobData.budget = undefined;
        }

        const cityId = jobData.cityId
          ? await this.resolveCityId(tx, jobData.cityId)
          : undefined;
        const categoryId = await this.resolveCategoryId(tx, jobData.categoryId);

        const job = await tx.job.create({
          data: {
            ...jobData,
            cityId,
            categoryId,
            clientId: user.id,
            companyId: company.id,
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
      },
    );
  }

  listActiveRequests(
    user: JwtUser,
    dto: QueryCompanyRequestsDto,
  ): Promise<CompanyJobListResponse | null> {
    return this.listRequests(user, dto, ACTIVE_JOB_STATUSES);
  }

  listRequestHistory(
    user: JwtUser,
    dto: QueryCompanyRequestsDto,
  ): Promise<CompanyJobListResponse | null> {
    return this.listRequests(user, dto, [JobStatus.CLOSED]);
  }

  getRequestById(
    user: JwtUser,
    jobId: string,
  ): Promise<CompanyJobPayload | null> {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      this.access.assertCustomerWorkspace(company);

      const job = await tx.job.findFirst({
        where: {
          id: jobId,
          companyId: company.id,
        },
        include: JOB_INCLUDE_BASE,
      });

      return job;
    });
  }

  updateRequest(
    user: JwtUser,
    jobId: string,
    dto: UpdateCompanyRequestDto,
  ): Promise<CompanyJobPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCustomerWorkspace(company);

        const existing = await tx.job.findFirst({
          where: {
            id: jobId,
            companyId: company.id,
          },
        });

        if (!existing) {
          throw AppErrors.notFound('Company request not found');
        }

        if (existing.status !== JobStatus.OPEN) {
          throw AppErrors.badRequest('Only open requests can be edited');
        }

        this.access.assertCanEditRequest(membership, existing, user.id);

        const nextType = dto.type ?? existing.type;
        const data: Prisma.JobUpdateInput = {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          minJoints: dto.minJoints,
        };

        if (dto.cityId !== undefined) {
          data.city = dto.cityId
            ? { connect: { id: await this.resolveCityId(tx, dto.cityId) } }
            : { disconnect: true };
        }

        if (dto.categoryId) {
          data.category = {
            connect: { id: await this.resolveCategoryId(tx, dto.categoryId) },
          };
        }

        if (nextType === JobType.FIXED_PRICE) {
          if (dto.budget !== undefined) {
            data.budget = dto.budget;
          }
          data.hourlyRate = null;
        } else if (nextType === JobType.HOURLY) {
          if (dto.hourlyRate !== undefined) {
            data.hourlyRate = dto.hourlyRate;
          }
          data.budget = null;
        }

        if (dto.photoFileIds) {
          await tx.jobPhoto.deleteMany({ where: { jobId } });
          data.photos = {
            create: dto.photoFileIds.map((fileId, order) => ({
              order,
              file: { connect: { id: fileId } },
            })),
          };
        }

        const job = await tx.job.update({
          where: { id: jobId },
          data,
          include: JOB_INCLUDE_BASE,
        });

        await this.jobsCache.invalidateJobCaches(jobId);
        return job;
      },
    );
  }

  private listRequests(
    user: JwtUser,
    dto: QueryCompanyRequestsDto,
    statuses: JobStatus[],
  ): Promise<CompanyJobListResponse | null> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      this.access.assertCustomerWorkspace(company);

      const where = {
        companyId: company.id,
        status: { in: statuses },
      };

      const [items, total] = await Promise.all([
        tx.job.findMany({
          where,
          include: JOB_INCLUDE_BASE,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.job.count({ where }),
      ]);

      return { items, total, page, limit };
    });
  }

  private async resolveCityId(
    tx: Prisma.TransactionClient,
    cityIdOrSlug: string,
  ): Promise<string> {
    const trimmed = cityIdOrSlug.trim();
    const city = await tx.city.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { slug: { equals: trimmed, mode: 'insensitive' } },
          { name: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!city) {
      throw AppErrors.badRequest('Invalid city');
    }

    return city.id;
  }

  private async resolveCategoryId(
    tx: Prisma.TransactionClient,
    categoryIdOrSlug: string,
  ): Promise<string> {
    const trimmed = categoryIdOrSlug.trim();
    const category = await tx.category.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { slug: { equals: trimmed, mode: 'insensitive' } },
          { name: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!category) {
      throw AppErrors.badRequest('Invalid category');
    }

    return category.id;
  }
}
