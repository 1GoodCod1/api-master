import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';

/**
 * Use AFTER OptionalJwtAuthGuard.
 * When forLead is NOT in query (or not 'true'/'1'), requires authenticated user.
 * This ensures chat/review uploads always have uploadedById set for security.
 */
@Injectable()
export class RequireAuthWhenNotForLeadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & RequestWithOptionalUser>();
    const raw = req.query?.forLead;
    const forLead = (typeof raw === 'string' ? raw : '').toLowerCase();
    const isForLead = forLead === 'true' || forLead === '1';

    if (!isForLead && !req.user?.id) {
      throw new UnauthorizedException(
        'Authentication required to upload files',
      );
    }

    return true;
  }
}
