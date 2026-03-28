import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AppErrors } from '../../../../common/errors';

/**
 * Централизованный обработчик ошибок для WebSocket модуля
 * Обеспечивает единообразную обработку и логирование ошибок
 */
@Injectable()
export class WebsocketErrorHandlerService {
  private readonly logger = new Logger(WebsocketErrorHandlerService.name);

  /**
   * Обработка ошибок с логированием и форматированием
   */
  handleError(error: unknown, context: string, userId?: string): WsException {
    const errorMessage: string = this.extractErrorMessage(error);
    const errorDetails: unknown = this.extractErrorDetails(error);

    // Логируем ошибку с контекстом
    this.logger.error(
      `[${context}] ${errorMessage}${userId ? ` (userId: ${userId})` : ''}`,
      errorDetails,
    );

    // Возвращаем безопасное сообщение для клиента (без внутренних деталей)
    return AppErrors.ws(this.getSafeErrorMessage(error));
  }

  /**
   * Обработка ошибок асинхронных операций
   */
  async handleAsyncError<T>(
    operation: () => Promise<T>,
    context: string,
    userId?: string,
    defaultValue?: T,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context, userId);
      return defaultValue ?? null;
    }
  }

  /**
   * Валидация входных данных с обработкой ошибок
   */
  validateInput<T extends Record<string, unknown>>(
    data: T,
    schema: Record<string, (value: unknown) => boolean>,
    context: string,
  ): void {
    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in data)) {
        throw this.handleError(
          new Error(`Missing required field: ${key}`),
          context,
        );
      }

      if (!validator(data[key])) {
        throw this.handleError(
          new Error(`Invalid value for field: ${key}`),
          context,
        );
      }
    }
  }

  /**
   * Извлечение сообщения об ошибке
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message: unknown }).message;
      return typeof msg === 'string' ? msg : 'Unknown error occurred';
    }
    return 'Unknown error occurred';
  }

  /**
   * Извлечение деталей ошибки для логирования
   */
  private extractErrorDetails(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    return error;
  }

  /**
   * Получение безопасного сообщения об ошибке для клиента
   * Не раскрывает внутренние детали системы
   */
  private getSafeErrorMessage(error: unknown): string {
    const msg =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

    // Если это уже WsException, возвращаем его сообщение
    if (error instanceof WsException) {
      return error.message;
    }

    // Если это известная ошибка валидации
    if (msg.includes('validation') || msg.includes('Validation')) {
      return 'Validation error: Invalid input data';
    }

    // Если это ошибка авторизации
    if (msg.includes('unauthorized') || msg.includes('Unauthorized')) {
      return 'Unauthorized: Access denied';
    }

    // Если это ошибка "не найдено"
    if (msg.includes('not found') || msg.includes('Not found')) {
      return 'Resource not found';
    }

    // Общее сообщение для неизвестных ошибок
    return 'An error occurred. Please try again later.';
  }

  /**
   * Обработка ошибок Redis с повторными попытками
   */
  async handleRedisError<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
  ): Promise<T | null> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        const errMsg = error instanceof Error ? error.message : String(error);
        // Если это ошибка подключения, пробуем еще раз
        if (errMsg.includes('ECONNREFUSED') || errMsg.includes('Connection')) {
          this.logger.warn(
            `[${context}] Redis connection error (attempt ${attempt}/${maxRetries}), retrying...`,
          );

          if (attempt < maxRetries) {
            await this.delay(1000 * attempt); // Экспоненциальная задержка
            continue;
          }
        }

        // Для других ошибок не повторяем
        break;
      }
    }

    this.handleError(lastError, context);
    return null;
  }

  /**
   * Задержка для повторных попыток
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Обработка ошибок парсинга JSON
   */
  parseJSONSafely<T>(
    jsonString: string,
    context: string,
    defaultValue?: T,
  ): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      this.logger.warn(
        `[${context}] Failed to parse JSON: ${jsonString.substring(0, 100)}`,
      );
      return defaultValue ?? null;
    }
  }
}
