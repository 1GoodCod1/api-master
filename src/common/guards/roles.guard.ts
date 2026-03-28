import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AppErrors, AppErrorMessages, AppErrorTemplates } from '../errors';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();
    const user = request.user;

    if (!user) {
      throw AppErrors.forbidden(AppErrorMessages.GUARD_USER_NOT_AUTHENTICATED);
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw AppErrors.forbidden(
        AppErrorTemplates.rolesRequired(requiredRoles, user.role),
      );
    }

    return true;
  }
}
