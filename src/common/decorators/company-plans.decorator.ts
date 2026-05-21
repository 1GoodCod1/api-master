import { SetMetadata } from '@nestjs/common';
import type { CompanySubscriptionPlan } from '@prisma/client';

export const COMPANY_PLANS_KEY = 'companyPlans';

export const CompanyPlans = (...plans: CompanySubscriptionPlan[]) =>
  SetMetadata(COMPANY_PLANS_KEY, plans);
