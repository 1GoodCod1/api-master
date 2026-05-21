import { AsyncLocalStorage } from 'async_hooks';
import type { CompanyMemberStatus, CompanyRole } from '@prisma/client';

export type CompanyMembershipSnapshot = {
  id: string;
  companyId: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
};

export type CompanyRequestContext = {
  userId: string;
  companyId: string | null;
  membership: CompanyMembershipSnapshot | null;
};

export const companyRequestContextStorage =
  new AsyncLocalStorage<CompanyRequestContext>();

export function getCompanyRequestContext(): CompanyRequestContext | undefined {
  return companyRequestContextStorage.getStore();
}

export const COMPANY_CONTEXT_HEADER = 'x-company-id';
