import { Injectable } from '@nestjs/common';
import {
  CompanySubscriptionPlan,
  CompanySubscriptionStatus,
  type CompanySubscription,
  type Prisma,
} from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { COMPANY_PLAN_RANK } from '../companies-subscription.constants';
import { CompaniesAccessService } from './companies-access.service';

export type CompanySubscriptionSummary = {
  plan: CompanySubscriptionPlan;
  status: CompanySubscriptionStatus;
  periodStart: Date;
  periodEnd: Date | null;
  isActive: boolean;
};

@Injectable()
export class CompaniesSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompaniesAccessService,
  ) {}

  getMySubscription(user: JwtUser): Promise<CompanySubscriptionSummary | null> {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) =>
      this.getSubscriptionSummary(tx, company.id),
    );
  }

  async ensureSubscription(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<CompanySubscription> {
    const existing = await tx.companySubscription.findUnique({
      where: { companyId },
    });
    if (existing) {
      return existing;
    }

    return tx.companySubscription.create({
      data: {
        companyId,
        plan: CompanySubscriptionPlan.FREE,
        status: CompanySubscriptionStatus.ACTIVE,
      },
    });
  }

  async getSubscriptionSummary(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<CompanySubscriptionSummary> {
    const subscription = await this.ensureSubscription(tx, companyId);
    return this.toSummary(subscription);
  }

  toSummary(subscription: CompanySubscription): CompanySubscriptionSummary {
    const isActive = this.isSubscriptionActive(subscription);
    return {
      plan: isActive ? subscription.plan : CompanySubscriptionPlan.FREE,
      status: subscription.status,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      isActive,
    };
  }

  isSubscriptionActive(subscription: CompanySubscription): boolean {
    if (subscription.status !== CompanySubscriptionStatus.ACTIVE) {
      return false;
    }
    if (!subscription.periodEnd) {
      return true;
    }
    return subscription.periodEnd.getTime() > Date.now();
  }

  getEffectivePlan(
    subscription: CompanySubscriptionSummary,
  ): CompanySubscriptionPlan {
    if (!subscription.isActive) {
      return CompanySubscriptionPlan.FREE;
    }
    return subscription.plan;
  }

  hasMinPlan(
    subscription: CompanySubscriptionSummary,
    minPlan: CompanySubscriptionPlan,
  ): boolean {
    const effective = this.getEffectivePlan(subscription);
    return (
      (COMPANY_PLAN_RANK[effective] ?? 1) >= (COMPANY_PLAN_RANK[minPlan] ?? 99)
    );
  }

  assertMinPlan(
    subscription: CompanySubscriptionSummary,
    minPlan: CompanySubscriptionPlan,
  ): void {
    if (!this.hasMinPlan(subscription, minPlan)) {
      throw AppErrors.forbidden(
        `This feature requires the ${minPlan} company plan`,
      );
    }
  }

  async resolveSubscriptionForUser(
    user: JwtUser,
  ): Promise<CompanySubscriptionSummary | null> {
    return this.prisma.withRlsContext(
      { currentUserId: user.id, userRole: user.role },
      async (tx) => {
        const membership = await this.access.resolveMembershipForUser(tx, user);
        if (!membership) {
          return null;
        }

        await tx.$executeRaw`
          SELECT set_config('app.current_company_id', ${membership.companyId}, true)
        `;

        return this.getSubscriptionSummary(tx, membership.companyId);
      },
    );
  }
}
