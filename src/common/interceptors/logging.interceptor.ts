import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user?: { id?: string };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { method, url, ip, user } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = user?.id || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const contentLength = response.get('content-length');
          const duration = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${contentLength} - ${duration}ms - ${ip} - ${userAgent} - User: ${userId}`,
          );
        },
        error: (error: unknown) => {
          const duration = Date.now() - now;
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(
            `${method} ${url} - ${duration}ms - ${ip} - ${userAgent} - User: ${userId} - Error: ${err.message}`,
            err.stack,
          );
        },
      }),
    );
  }
}
