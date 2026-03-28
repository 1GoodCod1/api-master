import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';
import { SORT_ASC, SORT_DESC } from '../../../../common/constants';
import type { AdminLeadsStats } from '../types';

export type { AdminLeadsStats };

/**
 * Сервис для управления лидами в админке
 */
@Injectable()
export class AdminLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeads(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const {
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      cursor,
    } = filters ?? {};
    const limitNumber = Number(limit) || 50;

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status as LeadStatus;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.LeadWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.LeadWhereInput)
      : where;

    const orderBy: Prisma.LeadOrderByWithRelationInput[] = [
      { createdAt: SORT_DESC },
      { id: SORT_DESC },
    ];

    const [rawLeads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: whereWithCursor,
        include: {
          client: {
            select: {
              avatarFile: { select: { path: true } },
              clientPhotos: {
                orderBy: { order: SORT_ASC },
                take: 1,
                select: {
                  file: { select: { path: true } },
                },
              },
            },
          },
          master: {
            select: {
              avatarFile: { select: { path: true } },
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatarFile: { select: { path: true } },
                },
              },
            },
          },
        },
        orderBy,
        ...(useCursor
          ? { take: limitNumber + 1 }
          : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.lead.count({ where }),
    ]);

    const leads = useCursor ? rawLeads.slice(0, limitNumber) : rawLeads;
    const nextCursor =
      useCursor && rawLeads.length > limitNumber
        ? nextCursorFromLastCreatedAtId(leads)
        : null;

    return {
      leads,
      pagination: {
        total,
        page: useCursor ? 1 : page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        nextCursor,
      },
    };
  }

  async getLeadsStats(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AdminLeadsStats> {
    const { dateFrom, dateTo } = filters ?? {};
    const where: Prisma.LeadWhereInput = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, newCount, inProgressCount, closedCount, premiumCount] =
      await Promise.all([
        this.prisma.lead.count({ where }),
        this.prisma.lead.count({
          where: { ...where, status: LeadStatus.NEW },
        }),
        this.prisma.lead.count({
          where: { ...where, status: LeadStatus.IN_PROGRESS },
        }),
        this.prisma.lead.count({
          where: { ...where, status: LeadStatus.CLOSED },
        }),
        this.prisma.lead.count({ where: { ...where, isPremium: true } }),
      ]);

    return { total, newCount, inProgressCount, closedCount, premiumCount };
  }

  async getLeadsExport(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const { status, dateFrom, dateTo } = filters ?? {};
    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status as LeadStatus;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        client: {
          select: {
            avatarFile: { select: { path: true } },
            clientPhotos: {
              orderBy: { order: SORT_ASC },
              take: 1,
              select: {
                file: { select: { path: true } },
              },
            },
          },
        },
        master: {
          select: {
            avatarFile: { select: { path: true } },
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatarFile: { select: { path: true } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: SORT_DESC }, { id: SORT_DESC }],
    });

    return { leads };
  }

  async getRecentLeads(limit: number = 10) {
    return this.prisma.lead.findMany({
      include: {
        master: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: SORT_DESC },
      take: limit,
    });
  }
}
