import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';
import { VERIFIED_KEY } from '../decorators/verified.decorator';

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
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === 'ADMIN') return true;

    if (!user.isVerified) {
      throw new ForbiddenException('Account verification required');
    }

    return true;
  }
}
