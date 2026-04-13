import {
  Inject,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { type Prisma, UserRole } from '@prisma/client';
import { LeadStatus } from '../../../../common/constants';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { CacheService } from '../../../shared/cache/cache.service';
import { decodeId, encodeId } from '../../../shared/utils/id-encoder';
import {
  buildCursorQuery,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../../shared/pagination/cursor-pagination';
import {
  LEAD_REPOSITORY,
  type ILeadRepository,
} from '../repositories/lead.repository';

@Injectable()
export class LeadsListService {
  private readonly logger = new Logger(LeadsListService.name);

  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepo: ILeadRepository,
    private readonly cache: CacheService,
  ) {}

  async findAll(
    authUser: JwtUser,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ) {
    try {
      if (authUser.role === UserRole.CLIENT) {
        const userId = authUser.id;
        const phone = authUser.phone || '';
        return await this.findAllForClient(userId, phone, options);
      }

      const masterId = authUser.masterProfile?.id;
      if (!masterId) {
        throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
      }

      return await this.findAllForMaster(masterId, options);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('findAll leads failed', err);
      throw err;
    }
  }

  private async findAllForMaster(
    masterId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const { status, limit: rawLimit = 20, cursor, page } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
    const cacheKey = this.cache.keys.masterLeads(
      masterId,
      status || null,
      page || 1,
    );

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const baseWhere: Prisma.LeadWhereInput = { masterId };
        if (status) baseWhere.status = status as LeadStatus;

        const queryParams = buildCursorQuery(
          baseWhere as Record<string, unknown>,
          cursor,
          page,
          limit,
        );

        const [rawLeads, total] = await Promise.all([
          this.leadRepo.findPageForMaster({
            where: queryParams.where as Prisma.LeadWhereInput,
            orderBy:
              queryParams.orderBy as Prisma.LeadOrderByWithRelationInput[],
            take: queryParams.take,
            skip: queryParams.skip,
          }),
          this.leadRepo.countByWhere(baseWhere),
        ]);

        const items = this.mapLeadsWithMasterEncodedId(rawLeads);
        return buildPaginatedResponse(
          items as unknown as Array<{ id: string; createdAt: Date }>,
          total,
          limit,
          queryParams.usedCursor,
        );
      },
      this.cache.ttl.leads,
    );
  }

  private async findAllForClient(
    userId: string,
    clientPhone: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const { status, limit: rawLimit = 20, cursor, page } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    const baseWhere: Prisma.LeadWhereInput = {
      OR: [{ clientId: userId }, { clientPhone }],
    };
    if (status) baseWhere.status = status as LeadStatus;

    const queryParams = buildCursorQuery(
      baseWhere as Record<string, unknown>,
      cursor,
      page,
      limit,
    );

    const [rawLeads, total] = await Promise.all([
      this.leadRepo.findPageForClient({
        where: queryParams.where as Prisma.LeadWhereInput,
        orderBy: queryParams.orderBy as Prisma.LeadOrderByWithRelationInput[],
        take: queryParams.take,
        skip: queryParams.skip,
      }),
      this.leadRepo.countByWhere(baseWhere),
    ]);

    const items = this.mapLeadsWithMasterEncodedId(rawLeads);
    return buildPaginatedResponse(
      items as unknown as Array<{ id: string; createdAt: Date }>,
      total,
      limit,
      queryParams.usedCursor,
    );
  }

  async findOne(idOrEncoded: string, authUser: JwtUser) {
    const decodedId = decodeId(idOrEncoded);
    const leadId = decodedId || idOrEncoded;

    const masterId = authUser.masterProfile?.id;

    const lead = await this.leadRepo.findDetailedById(leadId);

    if (!lead) throw AppErrors.notFound(AppErrorMessages.LEAD_NOT_FOUND);

    const withEncoded = this.mapLeadsWithMasterEncodedId([lead])[0];
    if (authUser.role === UserRole.ADMIN) return withEncoded;
    if (authUser.role === UserRole.CLIENT) {
      if (lead.clientId !== authUser.id) {
        throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
      }
      return withEncoded;
    }
    if (authUser.role === UserRole.MASTER) {
      if (!masterId) {
        throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
      }
      if (lead.masterId !== masterId) {
        throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
      }
      return withEncoded;
    }

    throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
  }

  private mapLeadsWithMasterEncodedId(
    leads: Array<{ id: string; master?: { id: string } | null }>,
  ) {
    return leads.map((lead) => ({
      ...lead,
      master: lead.master
        ? { ...lead.master, encodedId: encodeId(lead.master.id) }
        : lead.master,
    }));
  }
}
