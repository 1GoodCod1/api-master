import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../errors';
import { Reflector } from '@nestjs/core';
import { VERIFIED_KEY, type RequestWithOptionalUser } from '../decorators';
import { UserRole } from '@prisma/client';

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(VERIFIED_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (required === false || required === undefined) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithOptionalUser>();
    const user = req.user;

    if (!user) {
      throw AppErrors.forbidden(AppErrorMessages.GUARD_USER_NOT_AUTHENTICATED);
    }

    if (user.role === UserRole.ADMIN) return true;

    if (!user.isVerified) {
      throw AppErrors.forbidden(AppErrorMessages.GUARD_VERIFICATION_REQUIRED);
    }

    return true;
  }
}
