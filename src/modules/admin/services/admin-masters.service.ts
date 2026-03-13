import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TariffType } from '@prisma/client';
import { ReviewStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../shared/pagination/createdAtIdCursor';

/**
 * Сервис для управления мастерами в админке
 */
@Injectable()
export class AdminMastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getMasters(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const {
      verified,
      featured,
      tariff,
      page = 1,
      limit = 20,
      cursor,
    } = filters || {};
    const limitNumber = Number(limit) || 20;

    const where: Prisma.MasterWhereInput = {
      user: {
        isBanned: false,
        ...(verified !== undefined ? { isVerified: verified } : {}),
      },
    };

    if (featured !== undefined) where.isFeatured = featured;
    if (tariff) where.tariffType = tariff as TariffType;

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.MasterWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.MasterWhereInput)
      : where;

    const orderBy: Prisma.MasterOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
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
            },
          },
          category: true,
          city: true,
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
          : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.master.count({ where }),
    ]);

    const masters = useCursor ? rawMasters.slice(0, limitNumber) : rawMasters;
    const nextCursor =
      useCursor && rawMasters.length > limitNumber
        ? nextCursorFromLastCreatedAtId(masters)
        : null;

    return {
      masters,
      pagination: {
        total,
        page: useCursor ? 1 : page,
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
      throw new NotFoundException('Master not found');
    }

    const updateData: Prisma.MasterUpdateInput = {};
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.tariffType !== undefined) {
      const type = data.tariffType as TariffType;
      updateData.tariffType = type;
      if (type === 'VIP' || type === 'PREMIUM') {
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
    return this.prisma.master.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
        category: true,
        city: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
