import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TariffType } from '@prisma/client';
import type { Request } from 'express';
import { PLANS_KEY } from '../decorators/plans.decorator';

interface RequestUserWithProfile {
  role?: string;
  masterProfile?: {
    tariffType?: TariffType;
    tariffExpiresAt?: Date | string | null;
  } | null;
}

const PLAN_RANK: Record<TariffType, number> = {
  BASIC: 1,
  VIP: 2,
  PREMIUM: 3,
};

function getEffectivePlan(
  user: RequestUserWithProfile | null | undefined,
): TariffType {
  const mp = user?.masterProfile;

  const type = (mp?.tariffType as TariffType) ?? TariffType.BASIC;
  const exp = mp?.tariffExpiresAt ? new Date(mp.tariffExpiresAt) : null;

  if (type === TariffType.BASIC) return TariffType.BASIC;
  if (!exp) return TariffType.BASIC;
  if (exp.getTime() <= Date.now()) return TariffType.BASIC;
  return type;
}

@Injectable()
export class PlansGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<TariffType[]>(PLANS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: RequestUserWithProfile }>();
    const user = req.user;

    // admin — полный доступ
    if (user?.role === 'ADMIN') return true;

    const effective = getEffectivePlan(user);
    const effectiveRank = PLAN_RANK[effective] ?? 1;

    // Логика "доступ если тариф >= минимального"
    // Если ты хочешь строго "только перечисленные планы" — скажи, поменяю.
    const minRank = Math.min(...required.map((p) => PLAN_RANK[p] ?? 99));
    return effectiveRank >= minRank;
  }
}
