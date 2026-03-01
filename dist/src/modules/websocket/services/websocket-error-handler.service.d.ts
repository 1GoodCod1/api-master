import { WsException } from '@nestjs/websockets';
export declare class WebsocketErrorHandlerService {
    private readonly logger;
    handleError(error: unknown, context: string, userId?: string): WsException;
    handleAsyncError<T>(operation: () => Promise<T>, context: string, userId?: string, defaultValue?: T): Promise<T | null>;
    validateInput<T extends Record<string, unknown>>(data: T, schema: Record<string, (value: unknown) => boolean>, context: string): void;
    private extractErrorMessage;
    private extractErrorDetails;
    private getSafeErrorMessage;
    handleRedisError<T>(operation: () => Promise<T>, context: string, maxRetries?: number): Promise<T | null>;
    private delay;
    parseJSONSafely<T>(jsonString: string, context: string, defaultValue?: T): T | null;
}
