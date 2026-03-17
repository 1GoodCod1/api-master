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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService?: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaResult = this.mapPrismaError(exception);
      status = prismaResult.status;
      message = prismaResult.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { statusCode: status, message: 'Internal server error' };
    }

    const isProd = this.configService
      ? this.configService.get<string>('nodeEnv') === 'production'
      : process.env.NODE_ENV === 'production';
    const safeMessage =
      isProd && status >= 500
        ? { statusCode: status, message: 'Internal server error' }
        : typeof message === 'string'
          ? { message }
          : message;

    const errorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...safeMessage,
    };

    const isAuthClientError =
      status === 401 &&
      typeof request.url === 'string' &&
      (request.url.includes('/auth/refresh') ||
        request.url.includes('/auth/login'));
    if (isAuthClientError) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    response.status(status).json(errorResponse);
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
