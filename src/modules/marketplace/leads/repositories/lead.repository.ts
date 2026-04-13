import type { Lead, LeadStatus, Prisma } from '@prisma/client';

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');

export interface CreateLeadInput {
  id: string;
  masterId: string;
  clientPhone: string;
  clientName: string | null;
  clientId: string | null;
  message: string;
  spamScore: number;
  fileIds?: string[];
}

export type LeadWithFiles = Prisma.LeadGetPayload<{
  include: { files: { include: { file: true } } };
}>;

export type LeadForMasterList = Prisma.LeadGetPayload<{
  include: {
    files: {
      include: {
        file: {
          select: { id: true; path: true; mimetype: true; filename: true };
        };
      };
    };
    master: {
      select: {
        id: true;
        slug: true;
        user: { select: { firstName: true; lastName: true } };
        category: { select: { id: true; name: true } };
        city: { select: { id: true; name: true } };
      };
    };
  };
}>;

export type LeadForClientList = Prisma.LeadGetPayload<{
  include: {
    files: {
      include: {
        file: {
          select: { id: true; path: true; mimetype: true; filename: true };
        };
      };
    };
    master: {
      select: {
        id: true;
        slug: true;
        user: {
          select: {
            firstName: true;
            lastName: true;
            phone: true;
            email: true;
          };
        };
        category: { select: { id: true; name: true } };
        city: { select: { id: true; name: true } };
      };
    };
  };
}>;

export type LeadDetailed = Prisma.LeadGetPayload<{
  include: {
    files: {
      include: {
        file: {
          select: { id: true; path: true; mimetype: true; filename: true };
        };
      };
    };
    client: { select: { firstName: true; lastName: true } };
    master: {
      select: {
        id: true;
        slug: true;
        user: { select: { firstName: true; lastName: true } };
        category: { select: { id: true; name: true } };
        city: { select: { id: true; name: true } };
      };
    };
  };
}>;

export interface ActiveLeadSummary {
  id: string;
  status: LeadStatus;
  createdAt: Date;
  message: string;
  conversation: { id: string } | null;
}

export interface ClosedLeadSummary {
  id: string;
  status: LeadStatus;
  createdAt: Date;
  message: string;
}

export interface FindPageArgs {
  where: Prisma.LeadWhereInput;
  orderBy: Prisma.LeadOrderByWithRelationInput[];
  take: number;
  skip?: number;
}

export interface ILeadRepository {
  createWithFiles(input: CreateLeadInput): Promise<LeadWithFiles>;
  findById(leadId: string): Promise<Lead | null>;
  findDetailedById(leadId: string): Promise<LeadDetailed | null>;
  updateStatus(leadId: string, status: LeadStatus): Promise<Lead>;

  findActiveByClientAndMaster(
    clientId: string,
    masterId: string,
  ): Promise<Lead | null>;

  findPageForMaster(args: FindPageArgs): Promise<LeadForMasterList[]>;
  findPageForClient(args: FindPageArgs): Promise<LeadForClientList[]>;
  countByWhere(where: Prisma.LeadWhereInput): Promise<number>;

  countByMaster(masterId: string): Promise<number>;
  groupByStatus(
    masterId: string,
  ): Promise<Array<{ status: LeadStatus; count: number }>>;

  findLatestActiveSummaryForClientMaster(
    clientId: string,
    masterId: string,
  ): Promise<ActiveLeadSummary | null>;
  findLatestClosedSummaryForClientMaster(
    clientId: string,
    masterId: string,
  ): Promise<ClosedLeadSummary | null>;
}
