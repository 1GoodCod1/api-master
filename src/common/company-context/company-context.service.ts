import { Injectable } from '@nestjs/common';
import { CompanyMemberStatus } from '@prisma/client';
import { AppErrors } from '../errors';
import { CacheService } from '../../modules/shared/cache/cache.service';
import { PrismaService } from '../../modules/shared/database/prisma.service';
import type { ResolvedCompanyContext } from '../decorators/get-user.decorator';
import type { CompanyMembershipSnapshot } from './company-context.store';

export type CompanyMembershipOption = {
  companyId: string;
  companyName: string;
  slug: string;
  role: ResolvedCompanyContext['membership']['role'];
  mode: string;
};

export type CompanyMembershipListResponse = {
  activeCompanyId: string | null;
  items: CompanyMembershipOption[];
};

@Injectable()
export class CompanyContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async resolveForUser(
    userId: string,
    requestedCompanyId?: string | null,
  ): Promise<ResolvedCompanyContext | null> {
    const memberships = await this.listActiveMemberships(userId);
    if (memberships.length === 0) {
      return null;
    }

    const normalizedRequest = requestedCompanyId?.trim() || null;
    let selected = memberships[0];

    if (normalizedRequest) {
      const matched = memberships.find(
        (membership) => membership.companyId === normalizedRequest,
      );
      if (!matched) {
        throw AppErrors.forbidden(
          'You are not a member of the selected company',
        );
      }
      selected = matched;
    }

    return {
      companyId: selected.companyId,
      membership: selected,
    };
  }

  async listMembershipOptions(
    userId: string,
    activeCompanyId?: string | null,
  ): Promise<CompanyMembershipListResponse> {
    const memberships = await this.listActiveMembershipRecords(userId);
    const resolved = activeCompanyId
      ? memberships.find((item) => item.companyId === activeCompanyId)
      : memberships[0];

    return {
      activeCompanyId: resolved?.companyId ?? memberships[0]?.companyId ?? null,
      items: memberships.map((item) => ({
        companyId: item.companyId,
        companyName: item.company.name,
        slug: item.company.slug,
        role: item.role,
        mode: item.company.mode,
      })),
    };
  }

  private async listActiveMemberships(
    userId: string,
  ): Promise<ResolvedCompanyContext['membership'][]> {
    const cacheKey = this.cache.keys.companyMemberships(userId);
    const cached = await this.cache.get<CompanyMembershipSnapshot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const memberships = await this.prisma.companyMember.findMany({
      where: {
        userId,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
      },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        role: true,
        status: true,
      },
    });

    await this.cache.set(cacheKey, memberships, this.cache.ttl.companyContext);
    return memberships;
  }

  private async listActiveMembershipRecords(userId: string) {
    return this.prisma.companyMember.findMany({
      where: {
        userId,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
      },
      orderBy: { joinedAt: 'asc' },
      select: {
        companyId: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            mode: true,
          },
        },
      },
    });
  }

  async invalidateUserCompanyCache(userId: string): Promise<void> {
    await this.cache.del(this.cache.keys.companyMemberships(userId));
  }
}
