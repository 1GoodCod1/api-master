import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { RequestWithCompanyContext } from './get-user.decorator';

export const REQUIRE_COMPANY_KEY = 'requireCompany';

/** Route requires an active company membership in request context. */
export const RequireCompany = () => SetMetadata(REQUIRE_COMPANY_KEY, true);

export const SKIP_COMPANY_MEMBERSHIP_KEY = 'skipCompanyMembership';

/** Authenticated route that must not require company membership (create company, list memberships). */
export const SkipCompanyMembership = () =>
  SetMetadata(SKIP_COMPANY_MEMBERSHIP_KEY, true);

/** Inject resolved company context from interceptor (may be null). */
export const GetCompanyContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithCompanyContext>();
    return request.companyContext ?? null;
  },
);
