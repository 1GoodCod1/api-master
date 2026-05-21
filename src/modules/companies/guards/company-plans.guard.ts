import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanySubscriptionPlan, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { COMPANY_PLANS_KEY } from '../../../common/decorators/company-plans.decorator';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { COMPANY_PLAN_RANK } from '../companies-subscription.constants';
import { CompaniesSubscriptionService } from '../services/companies-subscription.service';

@Injectable()
export class CompanyPlansGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: CompaniesSubscriptionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      CompanySubscriptionPlan[]
    >(COMPANY_PLANS_KEY, [ctx.getHandler(), ctx.getClass()]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const user = req.user;
    if (!user) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const subscription =
      await this.subscriptions.resolveSubscriptionForUser(user);
    if (!subscription) {
      return false;
    }

    const effective = this.subscriptions.getEffectivePlan(subscription);
    const effectiveRank = COMPANY_PLAN_RANK[effective] ?? 1;
    const minRank = Math.min(
      ...required.map((plan) => COMPANY_PLAN_RANK[plan] ?? 99),
    );

    return effectiveRank >= minRank;
  }
}
