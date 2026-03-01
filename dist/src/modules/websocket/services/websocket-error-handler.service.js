"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WebsocketErrorHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketErrorHandlerService = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
let WebsocketErrorHandlerService = WebsocketErrorHandlerService_1 = class WebsocketErrorHandlerService {
    logger = new common_1.Logger(WebsocketErrorHandlerService_1.name);
    handleError(error, context, userId) {
        const errorMessage = this.extractErrorMessage(error);
        const errorDetails = this.extractErrorDetails(error);
        this.logger.error(`[${context}] ${errorMessage}${userId ? ` (userId: ${userId})` : ''}`, errorDetails);
        return new websockets_1.WsException(this.getSafeErrorMessage(error));
    }
    async handleAsyncError(operation, context, userId, defaultValue) {
        try {
            return await operation();
        }
        catch (error) {
            this.handleError(error, context, userId);
            return defaultValue ?? null;
        }
    }
    validateInput(data, schema, context) {
        for (const [key, validator] of Object.entries(schema)) {
            if (!(key in data)) {
                throw this.handleError(new Error(`Missing required field: ${key}`), context);
            }
            if (!validator(data[key])) {
                throw this.handleError(new Error(`Invalid value for field: ${key}`), context);
            }
        }
    }
    extractErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            const msg = error.message;
            return typeof msg === 'string' ? msg : 'Unknown error occurred';
        }
        return 'Unknown error occurred';
    }
    extractErrorDetails(error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                stack: error.stack,
                name: error.name,
            };
        }
        return error;
    }
    getSafeErrorMessage(error) {
        const msg = error instanceof Error
            ? error.message
            : error && typeof error === 'object' && 'message' in error
                ? String(error.message)
                : '';
        if (error instanceof websockets_1.WsException) {
            return error.message;
        }
        if (msg.includes('validation') || msg.includes('Validation')) {
            return 'Validation error: Invalid input data';
        }
        if (msg.includes('unauthorized') || msg.includes('Unauthorized')) {
            return 'Unauthorized: Access denied';
        }
        if (msg.includes('not found') || msg.includes('Not found')) {
            return 'Resource not found';
        }
        return 'An error occurred. Please try again later.';
    }
    async handleRedisError(operation, context, maxRetries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                const errMsg = error instanceof Error ? error.message : String(error);
                if (errMsg.includes('ECONNREFUSED') || errMsg.includes('Connection')) {
                    this.logger.warn(`[${context}] Redis connection error (attempt ${attempt}/${maxRetries}), retrying...`);
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt);
                        continue;
                    }
                }
                break;
            }
        }
        this.handleError(lastError, context);
        return null;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    parseJSONSafely(jsonString, context, defaultValue) {
        try {
            return JSON.parse(jsonString);
        }
        catch {
            this.logger.warn(`[${context}] Failed to parse JSON: ${jsonString.substring(0, 100)}`);
            return defaultValue ?? null;
        }
    }
};
exports.WebsocketErrorHandlerService = WebsocketErrorHandlerService;
exports.WebsocketErrorHandlerService = WebsocketErrorHandlerService = WebsocketErrorHandlerService_1 = __decorate([
    (0, common_1.Injectable)()
], WebsocketErrorHandlerService);
//# sourceMappingURL=websocket-error-handler.service.js.map