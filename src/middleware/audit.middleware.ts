import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../modules/audit/audit.service';
import type { RequestWithOptionalUser } from '../common/decorators/get-user.decorator';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const user = (req as RequestWithOptionalUser).user;

    if (this.shouldSkip(req.path)) {
      return next();
    }

    type WriteFn = (chunk: unknown, ...args: unknown[]) => boolean;
    type EndFn = (chunk?: unknown, ...args: unknown[]) => Response;
    const oldWrite = res.write.bind(res) as WriteFn;
    const oldEnd = res.end.bind(res) as EndFn;
    const chunks: Buffer[] = [];
    const auditService: AuditService = this.auditService;
    const sanitizeBody = this.sanitizeBody.bind(this) as (
      body: unknown,
    ) => unknown;
    const sanitizeResponse = this.sanitizeResponse.bind(this) as (
      response: string,
    ) => unknown;

    res.write = function (chunk: unknown, ...args: unknown[]): boolean {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Buffer),
        );
      }
      return oldWrite(chunk, ...args);
    };

    res.end = function (chunk?: unknown, ...args: unknown[]): Response {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Buffer),
        );
      }

      const responseBody = Buffer.concat(chunks).toString('utf8');

      process.nextTick(async () => {
        try {
          await auditService.log({
            userId: user?.id,
            action: `${req.method} ${req.path}`,
            entityType: 'HTTP_REQUEST',
            oldData: {
              method: req.method,
              path: req.path,
              query: req.query as Prisma.InputJsonValue,
              params: req.params,
              body: sanitizeBody(req.body) as Prisma.InputJsonValue,
            } as Prisma.InputJsonValue,
            newData: {
              statusCode: res.statusCode,
              response: sanitizeResponse(responseBody) as Prisma.InputJsonValue,
            } as Prisma.InputJsonValue,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        } catch (error) {
          // Don't crash the request
          console.error('Audit logging failed:', error);
        }
      });

      return oldEnd(chunk, ...args);
    };

    next();
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

    // Rmv sensitive data
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'creditCard',
      'cvv',
    ];
    for (const field of sensitiveFields) {
      if (field in sanitized && sanitized[field] != null) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private sanitizeResponse(response: string): unknown {
    try {
      const parsed: unknown = JSON.parse(response);
      return this.sanitizeBody(parsed);
    } catch {
      return response.substring(0, 100); // Truncate long res
    }
  }
}
