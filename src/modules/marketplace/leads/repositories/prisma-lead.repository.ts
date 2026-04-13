import { Injectable } from '@nestjs/common';
import type { Lead, LeadStatus, Prisma } from '@prisma/client';
import { ACTIVE_LEAD_STATUSES, SORT_DESC } from '../../../../common/constants';
import { LeadStatus as LeadStatusEnum } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  ActiveLeadSummary,
  ClosedLeadSummary,
  CreateLeadInput,
  FindPageArgs,
  ILeadRepository,
  LeadDetailed,
  LeadForClientList,
  LeadForMasterList,
  LeadWithFiles,
} from './lead.repository';

const LIST_FILE_SELECT = {
  id: true,
  path: true,
  mimetype: true,
  filename: true,
} as const;

@Injectable()
export class PrismaLeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithFiles(input: CreateLeadInput): Promise<LeadWithFiles> {
    const { fileIds, ...rest } = input;
    return this.prisma.lead.create({
      data: {
        ...rest,
        isPremium: false,
        files: fileIds?.length
          ? {
              createMany: {
                data: fileIds.map((id) => ({ fileId: id })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: { files: { include: { file: true } } },
    });
  }

  findById(leadId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }

  findDetailedById(leadId: string): Promise<LeadDetailed | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        files: { include: { file: { select: LIST_FILE_SELECT } } },
        client: { select: { firstName: true, lastName: true } },
        master: {
          select: {
            id: true,
            slug: true,
            user: { select: { firstName: true, lastName: true } },
            category: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  updateStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status, updatedAt: new Date() },
    });
  }

  findActiveByClientAndMaster(
    clientId: string,
    masterId: string,
  ): Promise<Lead | null> {
    return this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
      },
    });
  }

  findPageForMaster(args: FindPageArgs): Promise<LeadForMasterList[]> {
    return this.prisma.lead.findMany({
      where: args.where,
      orderBy: args.orderBy,
      take: args.take,
      skip: args.skip,
      include: {
        files: { include: { file: { select: LIST_FILE_SELECT } } },
        master: {
          select: {
            id: true,
            slug: true,
            user: { select: { firstName: true, lastName: true } },
            category: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  findPageForClient(args: FindPageArgs): Promise<LeadForClientList[]> {
    return this.prisma.lead.findMany({
      where: args.where,
      orderBy: args.orderBy,
      take: args.take,
      skip: args.skip,
      include: {
        files: { include: { file: { select: LIST_FILE_SELECT } } },
        master: {
          select: {
            id: true,
            slug: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            category: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  countByWhere(where: Prisma.LeadWhereInput): Promise<number> {
    return this.prisma.lead.count({ where });
  }

  countByMaster(masterId: string): Promise<number> {
    return this.prisma.lead.count({ where: { masterId } });
  }

  async groupByStatus(
    masterId: string,
  ): Promise<Array<{ status: LeadStatus; count: number }>> {
    const groups = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { masterId },
      _count: true,
    });
    return groups.map((g) => ({ status: g.status, count: g._count }));
  }

  findLatestActiveSummaryForClientMaster(
    clientId: string,
    masterId: string,
  ): Promise<ActiveLeadSummary | null> {
    return this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
        conversation: { select: { id: true } },
      },
      orderBy: { createdAt: SORT_DESC },
    });
  }

  findLatestClosedSummaryForClientMaster(
    clientId: string,
    masterId: string,
  ): Promise<ClosedLeadSummary | null> {
    return this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: LeadStatusEnum.CLOSED,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
      },
      orderBy: { createdAt: SORT_DESC },
    });
  }
}
