import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';
import { companyRequestContextStorage } from '../company-context/company-context.store';

@Injectable()
export class CompanyContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();
    const user = request.user;

    if (!user?.id) {
      return next.handle();
    }

    const resolved = request.companyContext ?? null;

    return new Observable((subscriber) => {
      companyRequestContextStorage.run(
        {
          userId: user.id,
          companyId: resolved?.companyId ?? null,
          membership: resolved?.membership ?? null,
        },
        () => {
          next.handle().subscribe(subscriber);
        },
      );
    });
  }
}
