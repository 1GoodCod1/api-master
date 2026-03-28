import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { getRequestId } from '../request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService?: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let rawBody: string | object;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaResult = this.mapPrismaError(exception);
      status = prismaResult.status;
      rawBody = prismaResult.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      rawBody = exception.getResponse();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      rawBody = {
        statusCode: status,
        message: 'Internal server error',
      };
    }

    const isProd = this.configService
      ? this.configService.get<string>('nodeEnv') === 'production'
      : process.env.NODE_ENV === 'production';

    const payload = this.buildErrorPayload(status, rawBody, isProd);
    const requestId = getRequestId();

    const errorResponse = {
      success: false,
      statusCode: status,
      ...payload,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(requestId ? { requestId } : {}),
    };

    const isAuthClientError =
      status === 401 &&
      typeof request.url === 'string' &&
      (request.url.includes('/auth/refresh') ||
        request.url.includes('/auth/login'));
    const logSuffix = requestId ? ` requestId=${requestId}` : '';
    if (isAuthClientError) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(rawBody)}${logSuffix}`,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(rawBody)}${logSuffix}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    response.status(status).json(errorResponse);
  }

  private buildErrorPayload(
    status: number,
    raw: string | object,
    hideProd500Details: boolean,
  ): Record<string, unknown> {
    if (hideProd500Details && status >= 500) {
      return { message: 'Internal server error' };
    }

    if (typeof raw === 'string') {
      return { message: raw };
    }

    const o = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    if (o.message !== undefined) {
      out.message = o.message;
    } else if (typeof o.error === 'string') {
      out.message = o.error;
    } else {
      out.message = 'Request failed';
    }

    if (typeof o.error === 'string') {
      out.error = o.error;
    }

    if (o.fields !== undefined) {
      out.fields = o.fields;
    }

    return out;
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: object;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: {
            statusCode: HttpStatus.CONFLICT,
            message: 'Unique constraint violation',
            fields: exception.meta?.target,
          },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Record not found',
          },
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Foreign key constraint failed',
          },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          },
        };
    }
  }
}
