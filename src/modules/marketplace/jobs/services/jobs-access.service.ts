import { Injectable } from '@nestjs/common';
import {
  CompanyMemberStatus,
  CompanyMode,
  CompanyRole,
  type Prisma,
} from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';

type CustomerJobRef = {
  clientId: string;
  companyId: string | null;
};

type ApplyJobRef = CustomerJobRef;

@Injectable()
export class JobsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isDirectJobOwner(userId: string, job: CustomerJobRef): boolean {
    return job.clientId === userId;
  }

  async canManageJobAsCustomer(
    userId: string,
    job: CustomerJobRef,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    if (this.isDirectJobOwner(userId, job)) {
      return true;
    }

    if (!job.companyId) {
      return false;
    }

    const db = tx ?? this.prisma;
    const member = await db.companyMember.findFirst({
      where: {
        userId,
        companyId: job.companyId,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
        role: {
          in: [CompanyRole.OWNER, CompanyRole.MANAGER, CompanyRole.MEMBER],
        },
      },
      select: { id: true },
    });

    return Boolean(member);
  }

  async assertCanManageJobAsCustomer(
    userId: string,
    job: CustomerJobRef,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const allowed = await this.canManageJobAsCustomer(userId, job, tx);
    if (!allowed) {
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    }
  }

  async assertCanApplyToJob(
    userId: string,
    masterId: string,
    job: ApplyJobRef,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (this.isDirectJobOwner(userId, job)) {
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLY_OWN_JOB);
    }

    const db = tx ?? this.prisma;

    if (job.companyId) {
      const memberOnJobCompany = await db.companyMember.findFirst({
        where: {
          userId,
          companyId: job.companyId,
          leftAt: null,
          status: CompanyMemberStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (memberOnJobCompany) {
        throw AppErrors.forbidden(AppErrorMessages.JOB_APPLY_SAME_COMPANY);
      }
    }

    const masterMembership = await db.companyMember.findFirst({
      where: {
        masterId,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
      },
      include: {
        company: { select: { id: true, mode: true } },
      },
    });

    if (!masterMembership) {
      return;
    }

    if (job.companyId && masterMembership.companyId === job.companyId) {
      throw AppErrors.forbidden(AppErrorMessages.JOB_APPLY_SAME_COMPANY);
    }

    if (
      masterMembership.company.mode !== CompanyMode.PROVIDER &&
      masterMembership.company.mode !== CompanyMode.BOTH
    ) {
      throw AppErrors.forbidden(
        AppErrorMessages.JOB_APPLY_COMPANY_NOT_PROVIDER,
      );
    }
  }
}
