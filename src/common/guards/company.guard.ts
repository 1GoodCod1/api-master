import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppErrors } from '../errors';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';
import {
  REQUIRE_COMPANY_KEY,
  SKIP_COMPANY_MEMBERSHIP_KEY,
} from '../decorators/company-context.decorator';
import { COMPANY_CONTEXT_HEADER } from '../company-context/company-context.store';
import { CompanyContextService } from '../company-context/company-context.service';

@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companyContext: CompanyContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();

    if (request.user?.id && request.companyContext === undefined) {
      const headerValue = request.headers[COMPANY_CONTEXT_HEADER];
      const requestedCompanyId = Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue;
      request.companyContext = await this.companyContext.resolveForUser(
        request.user.id,
        requestedCompanyId,
      );
    }

    const skipMembership = this.reflector.getAllAndOverride<boolean>(
      SKIP_COMPANY_MEMBERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipMembership) {
      return true;
    }

    const requireCompany = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_COMPANY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requireCompany) {
      return true;
    }

    if (!request.user) {
      // JwtAuthGuard on CompaniesController must run before this guard.
      throw AppErrors.unauthorized('Authentication required');
    }

    if (!request.companyContext?.membership) {
      throw AppErrors.forbidden('Active company membership required');
    }

    return true;
  }
}
