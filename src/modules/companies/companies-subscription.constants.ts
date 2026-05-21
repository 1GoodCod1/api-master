import type { CompanySubscriptionPlan } from '@prisma/client';

export const COMPANY_PLAN_RANK: Record<CompanySubscriptionPlan, number> = {
  FREE: 1,
  PRO: 2,
  BUSINESS: 3,
};

export const COMPANY_PLAN_FEATURES: Record<
  CompanySubscriptionPlan,
  readonly string[]
> = {
  FREE: ['marketplace_profile', 'team', 'company_requests', 'provider_listing'],
  PRO: [
    'marketplace_profile',
    'team',
    'company_requests',
    'provider_listing',
    'crm_clients',
    'operations',
    'calendar',
  ],
  BUSINESS: [
    'marketplace_profile',
    'team',
    'company_requests',
    'provider_listing',
    'crm_clients',
    'operations',
    'calendar',
    'estimates',
    'invoicing',
    'premium_jobs',
  ],
};
