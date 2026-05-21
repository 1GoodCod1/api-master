import { Injectable } from '@nestjs/common';
import {
  CompanyMemberStatus,
  CompanyMode,
  CompanyRole,
  type Prisma,
} from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import { getCompanyRequestContext } from '../../../common/company-context/company-context.store';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { COMPANY_INCLUDE_BASE } from '../companies.constants';
import type { CompanyWithRelations } from '../companies.types';

export type ActiveCompanyMembership = {
  id: string;
  companyId: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
};

@Injectable()
export class CompaniesAccessService {
  constructor(private readonly prisma: PrismaService) {}

  findActiveMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId?: string | null,
  ): Promise<ActiveCompanyMembership | null> {
    return tx.companyMember.findFirst({
      where: {
        userId,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
        ...(companyId ? { companyId } : {}),
      },
      orderBy: {
        joinedAt: 'asc',
      },
      select: {
        id: true,
        companyId: true,
        role: true,
        status: true,
      },
    });
  }

  resolveMembershipForUser(
    tx: Prisma.TransactionClient,
    user: JwtUser,
  ): Promise<ActiveCompanyMembership | null> {
    const requestContext = getCompanyRequestContext();
    if (requestContext?.userId === user.id && requestContext.membership) {
      return Promise.resolve(requestContext.membership);
    }

    return this.findActiveMembership(
      tx,
      user.id,
      requestContext?.companyId ?? null,
    );
  }

  canManageRequests(role: CompanyRole): boolean {
    return (
      role === CompanyRole.OWNER ||
      role === CompanyRole.MANAGER ||
      role === CompanyRole.MEMBER
    );
  }

  assertCustomerWorkspace(company: { mode: CompanyMode }): void {
    if (
      company.mode !== CompanyMode.CUSTOMER &&
      company.mode !== CompanyMode.BOTH
    ) {
      throw AppErrors.forbidden(
        'Company workspace is not configured for ordering services',
      );
    }
  }

  assertCanCreateRequest(membership: ActiveCompanyMembership): void {
    if (
      membership.status !== CompanyMemberStatus.ACTIVE ||
      !this.canManageRequests(membership.role)
    ) {
      throw AppErrors.forbidden(
        'You do not have permission to create company requests',
      );
    }
  }

  assertCanEditRequest(
    membership: ActiveCompanyMembership,
    job: { clientId: string },
    userId: string,
  ): void {
    if (
      membership.status !== CompanyMemberStatus.ACTIVE ||
      !this.canManageRequests(membership.role)
    ) {
      throw AppErrors.forbidden(
        'You do not have permission to edit company requests',
      );
    }

    const isCreator = job.clientId === userId;
    const isManager =
      membership.role === CompanyRole.OWNER ||
      membership.role === CompanyRole.MANAGER;

    if (!isCreator && !isManager) {
      throw AppErrors.forbidden(
        'Only the request creator or company managers can edit this request',
      );
    }
  }

  assertProviderWorkspace(company: { mode: CompanyMode }): void {
    if (
      company.mode !== CompanyMode.PROVIDER &&
      company.mode !== CompanyMode.BOTH
    ) {
      throw AppErrors.forbidden(
        'Company workspace is not configured for offering services',
      );
    }
  }

  assertCanManageProvider(membership: ActiveCompanyMembership): void {
    if (membership.status !== CompanyMemberStatus.ACTIVE) {
      throw AppErrors.forbidden('Inactive company membership');
    }

    if (
      membership.role !== CompanyRole.OWNER &&
      membership.role !== CompanyRole.MANAGER
    ) {
      throw AppErrors.forbidden(
        'Only company owners and managers can manage the provider profile',
      );
    }
  }

  assertCanPublish(membership: ActiveCompanyMembership): void {
    if (membership.role !== CompanyRole.OWNER) {
      throw AppErrors.forbidden(
        'Only the company owner can publish the profile',
      );
    }
  }

  assertCanManageLegal(membership: ActiveCompanyMembership): void {
    if (membership.role !== CompanyRole.OWNER) {
      throw AppErrors.forbidden(
        'Only the company owner can update legal and billing data',
      );
    }
  }

  assertCanManageTeam(membership: ActiveCompanyMembership): void {
    if (membership.status !== CompanyMemberStatus.ACTIVE) {
      throw AppErrors.forbidden('Inactive company membership');
    }

    if (
      membership.role !== CompanyRole.OWNER &&
      membership.role !== CompanyRole.MANAGER
    ) {
      throw AppErrors.forbidden(
        'Only company owners and managers can manage the team',
      );
    }
  }

  withMyCompanyContext<T>(
    user: JwtUser,
    work: (ctx: {
      tx: Prisma.TransactionClient;
      membership: ActiveCompanyMembership;
      company: CompanyWithRelations;
    }) => Promise<T>,
  ): Promise<T | null> {
    return this.prisma.withRlsContext(
      { currentUserId: user.id, userRole: user.role },
      async (tx) => {
        const membership = await this.resolveMembershipForUser(tx, user);
        if (!membership) {
          return null;
        }

        await tx.$executeRaw`
          SELECT set_config('app.current_company_id', ${membership.companyId}, true)
        `;

        const company = await tx.company.findUnique({
          where: { id: membership.companyId },
          include: COMPANY_INCLUDE_BASE,
        });

        if (!company) {
          return null;
        }

        return work({ tx, membership, company });
      },
    );
  }
}
