import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditEntityType } from '../../modules/audit/audit-entity-type.enum';
import { stripApiPrefix } from '../utils/api-route.util';

interface RequestWithUser extends Request {
  user?: { id?: string };
}

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'refreshToken',
  'accessToken',
  'creditCard',
  'cvv',
  'otp',
  'otpCode',
  'twoFactorSecret',
  'currentPassword',
  'newPassword',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.config.get<boolean>('audit.httpEnabled')) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;

    if (this.shouldSkip(request.path, request.method)) {
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
        entityType: AuditEntityType.HttpRequest,
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

  private shouldSkip(path: string, method: string): boolean {
    const normalized = stripApiPrefix(path.split('?')[0] ?? path);

    const prefixSkips = [
      '/health',
      '/metrics',
      '/docs',
      '/favicon.ico',
      '/uploads',
      '/admin',
    ];
    if (prefixSkips.some((p) => normalized.startsWith(p))) {
      return true;
    }

    const authSecrets = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];
    if (
      authSecrets.some(
        (p) => normalized === p || normalized.startsWith(`${p}/`),
      )
    ) {
      return true;
    }

    if (method === 'GET' && normalized.startsWith('/auth/')) {
      return true;
    }

    return false;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };

    for (const field of SENSITIVE_FIELDS) {
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
