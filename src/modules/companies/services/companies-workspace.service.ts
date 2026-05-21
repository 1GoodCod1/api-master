import { Injectable } from '@nestjs/common';
import {
  CompanyMemberStatus,
  CompanyMode,
  CompanyRole,
  JobStatus,
  type Company,
  type Prisma,
} from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { COMPANY_INCLUDE_BASE } from '../companies.constants';
import type {
  CompanyCustomerWorkspace,
  CompanyProviderWorkspace,
  CompanyWithRelations,
  CompanyWorkspacePayload,
  CompanyWorkspaceResponse,
  CompanyWorkspaceSummary,
  CompanyMembershipContext,
} from '../companies.types';
import type { ActiveCompanyMembership } from './companies-access.service';
import { CompaniesAccessService } from './companies-access.service';
import { CompaniesSubscriptionService } from './companies-subscription.service';

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  JobStatus.OPEN,
  JobStatus.FOUND,
  JobStatus.PENDING_CLOSE,
];

@Injectable()
export class CompaniesWorkspaceService {
  constructor(
    private readonly access: CompaniesAccessService,
    private readonly subscriptions: CompaniesSubscriptionService,
  ) {}

  getMyCompanyWorkspace(user: JwtUser): Promise<CompanyWorkspaceResponse> {
    return this.access.withMyCompanyContext(
      user,
      async ({ company, membership, tx }) => ({
        company,
        workspace: await this.buildWorkspaceSummary(tx, company, membership),
      }),
    );
  }

  async updateCompanyMode(
    user: JwtUser,
    mode: CompanyMode,
  ): Promise<CompanyWorkspacePayload> {
    const result = await this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        if (membership.role !== CompanyRole.OWNER) {
          throw AppErrors.forbidden(
            'Only the company owner can change workspace mode',
          );
        }

        await tx.company.update({
          where: { id: company.id },
          data: { mode },
        });

        const updatedCompany = await tx.company.findUniqueOrThrow({
          where: { id: company.id },
          include: COMPANY_INCLUDE_BASE,
        });

        return {
          company: updatedCompany,
          workspace: await this.buildWorkspaceSummary(
            tx,
            updatedCompany,
            membership,
          ),
        };
      },
    );

    if (!result) {
      throw AppErrors.notFound('Company not found');
    }

    return result;
  }

  private async buildWorkspaceSummary(
    tx: Prisma.TransactionClient,
    company: CompanyWithRelations,
    membership: ActiveCompanyMembership,
  ): Promise<CompanyWorkspaceSummary> {
    const activeMembers = company.members.filter(
      (member) =>
        member.status === CompanyMemberStatus.ACTIVE && member.leftAt == null,
    );
    const requestCreators = activeMembers.filter((member) =>
      this.access.canManageRequests(member.role),
    );

    const summary: CompanyWorkspaceSummary = {
      mode: company.mode,
      membership: this.buildMembershipContext(membership),
      subscription: await this.subscriptions.getSubscriptionSummary(
        tx,
        company.id,
      ),
    };

    if (
      company.mode === CompanyMode.CUSTOMER ||
      company.mode === CompanyMode.BOTH
    ) {
      const [activeRequestsCount, historyCount] = await Promise.all([
        tx.job.count({
          where: {
            companyId: company.id,
            status: { in: ACTIVE_JOB_STATUSES },
          },
        }),
        tx.job.count({
          where: {
            companyId: company.id,
            status: JobStatus.CLOSED,
          },
        }),
      ]);

      summary.customer = this.buildCustomerWorkspace(
        activeRequestsCount,
        historyCount,
        requestCreators.length,
        membership,
      );
    }

    if (
      company.mode === CompanyMode.PROVIDER ||
      company.mode === CompanyMode.BOTH
    ) {
      summary.provider = await this.buildProviderWorkspace(
        tx,
        company,
        activeMembers.length,
      );
    }

    return summary;
  }

  async buildWorkspacePayload(
    tx: Prisma.TransactionClient,
    company: CompanyWithRelations,
    membership: ActiveCompanyMembership,
  ): Promise<CompanyWorkspacePayload> {
    return {
      company,
      workspace: await this.buildWorkspaceSummary(tx, company, membership),
    };
  }

  private buildMembershipContext(
    membership: ActiveCompanyMembership,
  ): CompanyMembershipContext {
    return {
      role: membership.role,
      status: membership.status,
      canManageTeam:
        membership.status === CompanyMemberStatus.ACTIVE &&
        (membership.role === CompanyRole.OWNER ||
          membership.role === CompanyRole.MANAGER),
      canManageProvider:
        membership.status === CompanyMemberStatus.ACTIVE &&
        (membership.role === CompanyRole.OWNER ||
          membership.role === CompanyRole.MANAGER),
      canManageLegal: membership.role === CompanyRole.OWNER,
      canCreateRequest:
        membership.status === CompanyMemberStatus.ACTIVE &&
        this.access.canManageRequests(membership.role),
    };
  }

  private buildCustomerWorkspace(
    activeRequestsCount: number,
    historyCount: number,
    requestCreatorsCount: number,
    membership: ActiveCompanyMembership,
  ): CompanyCustomerWorkspace {
    return {
      activeRequestsCount,
      historyCount,
      requestCreatorsCount,
      canCreateRequest:
        membership.status === CompanyMemberStatus.ACTIVE &&
        this.access.canManageRequests(membership.role),
    };
  }

  private async buildProviderWorkspace(
    tx: Prisma.TransactionClient,
    company: Company,
    teamMembersCount: number,
  ): Promise<CompanyProviderWorkspace> {
    const servicesCount = await tx.companyService.count({
      where: { companyId: company.id, isActive: true },
    });
    const profileCompletionPercent = this.calculateProfileCompletion(company);

    return {
      servicesCount,
      teamMembersCount,
      isPublished: company.isPublished,
      isVerified: company.isVerified,
      canPublish:
        !company.isPublished &&
        profileCompletionPercent >= 60 &&
        Boolean(company.categoryId) &&
        Boolean(company.description?.trim()) &&
        servicesCount > 0,
      profileCompletionPercent,
    };
  }

  private calculateProfileCompletion(company: Company): number {
    const checks = [
      Boolean(company.name?.trim()),
      Boolean(company.legalName?.trim()),
      Boolean(company.categoryId),
      Boolean(company.description?.trim()),
      Boolean(company.contactPhone?.trim() || company.contactEmail?.trim()),
      Boolean(company.logoFileId),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }
}
