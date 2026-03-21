import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    if (err || !user) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      // Если JWT токен истек или невалиден, выбрасываем UnauthorizedException
      // Frontend должен обработать 401 и попытаться обновить токен через /auth/refres
      throw new UnauthorizedException('Invalid or expired token');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- base AuthGuard returns user as any
    return user;
  }
}
