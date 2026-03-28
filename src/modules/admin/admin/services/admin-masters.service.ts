import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { Prisma } from '@prisma/client';
import {
  ReviewStatus,
  SUBSCRIPTION_TARIFF_TYPES,
  TariffType,
} from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../../common/constants';

/**
 * Сервис для управления мастерами в админке
 */
@Injectable()
export class AdminMastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private buildMastersWhereFromFilters(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
  }): Prisma.MasterWhereInput {
    const { verified, featured, tariff } = filters ?? {};

    const where: Prisma.MasterWhereInput = {
      user: {
        isBanned: false,
        ...(verified !== undefined ? { isVerified: verified } : {}),
      },
    };

    if (featured !== undefined) where.isFeatured = featured;
    if (tariff) where.tariffType = tariff as TariffType;
    return where;
  }

  /**
   * Aggregates for current list filters — independent of pagination.
   */
  async getMastersStats(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
  }) {
    const where = this.buildMastersWhereFromFilters(filters);

    const whereVerified: Prisma.MasterWhereInput = {
      AND: [
        where,
        {
          user: {
            isBanned: false,
            isVerified: true,
          },
        },
      ],
    };

    const whereFeatured: Prisma.MasterWhereInput = {
      AND: [where, { isFeatured: true }],
    };

    const [total, verified, featured, avgAgg] = await Promise.all([
      this.prisma.master.count({ where }),
      this.prisma.master.count({ where: whereVerified }),
      this.prisma.master.count({ where: whereFeatured }),
      this.prisma.master.aggregate({
        where,
        _avg: { rating: true },
      }),
    ]);

    const avgRating = avgAgg._avg.rating ?? 0;

    return {
      total,
      stats: {
        verified,
        featured,
        avgRating: Number.isFinite(avgRating) ? avgRating : 0,
      },
    };
  }

  async getMasters(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const { page = 1, limit = 20, cursor } = filters ?? {};
    const limitNumber = Number(limit) || 20;
    const pageNumber = Number(page) || 1;

    const where = this.buildMastersWhereFromFilters(filters);

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.MasterWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.MasterWhereInput)
      : where;

    const orderBy: Prisma.MasterOrderByWithRelationInput[] = [
      { createdAt: SORT_DESC },
      { id: SORT_DESC },
    ];

    const [rawMasters, total] = await Promise.all([
      this.prisma.master.findMany({
        where: whereWithCursor,
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              isVerified: true,
              firstName: true,
              lastName: true,
              avatarFile: { select: { path: true } },
            },
          },
          avatarFile: { select: { path: true } },
          category: true,
          city: true,
          photos: {
            orderBy: { order: SORT_ASC },
            take: 24,
            include: {
              file: { select: { path: true } },
            },
          },
          _count: {
            select: {
              leads: true,
              reviews: {
                where: { status: ReviewStatus.VISIBLE },
              },
            },
          },
        },
        orderBy,
        ...(useCursor
          ? { take: limitNumber + 1 }
          : { skip: (pageNumber - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.master.count({ where }),
    ]);

    const sliced = useCursor ? rawMasters.slice(0, limitNumber) : rawMasters;
    const nextCursor =
      useCursor && rawMasters.length > limitNumber
        ? nextCursorFromLastCreatedAtId(sliced)
        : null;

    const masters = sliced.map((m) => ({
      ...m,
      fullName:
        [m.user?.firstName, m.user?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
    }));

    return {
      masters,
      pagination: {
        total,
        page: useCursor ? 1 : pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        nextCursor,
      },
    };
  }

  async updateMaster(
    masterId: string,
    data: {
      isFeatured?: boolean;
      tariffType?: string;
    },
  ) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
    });

    if (!master) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
    }

    const updateData: Prisma.MasterUpdateInput = {};
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.tariffType !== undefined) {
      const type = data.tariffType as TariffType;
      updateData.tariffType = type;
      if (SUBSCRIPTION_TARIFF_TYPES.includes(type)) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        updateData.tariffExpiresAt = expiresAt;
      } else {
        updateData.tariffExpiresAt = null;
      }
    }

    const updated = await this.prisma.master.update({
      where: { id: masterId },
      data: updateData,
    });

    if (data.tariffType !== undefined && updated.userId) {
      await Promise.all([
        this.cache.del(this.cache.keys.userProfile(updated.userId)),
        this.cache.del(this.cache.keys.userMasterProfile(updated.userId)),
        this.cache.invalidateMasterRelated(masterId),
      ]);
    }

    return updated;
  }

  async getRecentMasters(limit: number = 10) {
    const rows = await this.prisma.master.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        city: true,
      },
      orderBy: { createdAt: SORT_DESC },
      take: limit,
    });
    return rows.map((m) => ({
      ...m,
      fullName:
        [m.user?.firstName, m.user?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
    }));
  }
}
