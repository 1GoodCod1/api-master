import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../../modules/audit/audit.service';

interface RequestWithUser extends Request {
  user?: { id?: string };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;

    if (this.shouldSkip(request.path)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        void this.logAudit(data, duration, request, response, user).catch(
          () => {},
        );
      }),
    );
  }

  private async logAudit(
    data: unknown,
    duration: number,
    request: RequestWithUser,
    response: Response,
    user: RequestWithUser['user'],
  ): Promise<void> {
    try {
      await this.auditService.log({
        userId: user?.id,
        action: `${request.method} ${request.path}`,
        entityType: 'HTTP_REQUEST',
        oldData: {
          method: request.method,
          path: request.path,
          query: request.query as Prisma.InputJsonValue,
          params: request.params,
          body: this.sanitizeBody(request.body) as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
        newData: {
          statusCode: response.statusCode,
          response: this.sanitizeResponse(data) as Prisma.InputJsonValue,
          duration,
        } as Prisma.InputJsonValue,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private shouldSkip(path: string): boolean {
    const skippedPaths = [
      '/health',
      '/metrics',
      '/docs',
      '/admin',
      '/favicon.ico',
    ];

    return skippedPaths.some((skipPath) => path.startsWith(skipPath));
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };
    const sensitiveFields = ['password', 'token', 'secret'];

    for (const field of sensitiveFields) {
      if (field in sanitized && sanitized[field] != null) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private sanitizeResponse(response: unknown): unknown {
    if (typeof response === 'string') {
      return response.length > 100
        ? response.substring(0, 100) + '...'
        : response;
    }

    if (response && typeof response === 'object') {
      return { type: 'object', keys: Object.keys(response) };
    }

    return response;
  }
}
