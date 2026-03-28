import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

/**
 * Единая фабрика HTTP-исключений NestJS.
 *
 * | Метод | HTTP-код |
 * |-------|----------|
 * | `badRequest` | 400 |
 * | `unauthorized` | 401 |
 * | `forbidden` | 403 |
 * | `notFound` | 404 |
 * | `conflict` | 409 |
 * | `serviceUnavailable` | 503 |
 * | `internal` | 500 |
 * | `ws` | WebSocket (не HTTP) |
 *
 * `badRequest` принимает и объект тела (например, validation pipe с полями).
 *
 * @example
 * throw AppErrors.forbidden(AppErrorMessages.ANALYTICS_OWN_ONLY);
 * throw AppErrors.badRequest(AppErrorTemplates.tariffTypeExists(dto.type));
 */
export class AppErrors {
  private constructor() {}

  static badRequest(
    message: string | Record<string, unknown>,
  ): BadRequestException {
    return new BadRequestException(message);
  }

  static notFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static forbidden(message: string): ForbiddenException {
    return new ForbiddenException(message);
  }

  static unauthorized(message: string): UnauthorizedException {
    return new UnauthorizedException(message);
  }

  static conflict(message: string): ConflictException {
    return new ConflictException(message);
  }

  static internal(message: string): InternalServerErrorException {
    return new InternalServerErrorException(message);
  }

  static serviceUnavailable(message: string): ServiceUnavailableException {
    return new ServiceUnavailableException(message);
  }

  static ws(message: string | object): WsException {
    return new WsException(message);
  }
}
