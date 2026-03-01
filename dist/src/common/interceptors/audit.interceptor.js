"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_service_1 = require("../../modules/audit/audit.service");
let AuditInterceptor = class AuditInterceptor {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const user = request.user;
        if (this.shouldSkip(request.path)) {
            return next.handle();
        }
        const startTime = Date.now();
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = Date.now() - startTime;
            void this.logAudit(data, duration, request, response, user);
        }));
    }
    async logAudit(data, duration, request, response, user) {
        try {
            await this.auditService.log({
                userId: user?.id,
                action: `${request.method} ${request.path}`,
                entityType: 'HTTP_REQUEST',
                oldData: {
                    method: request.method,
                    path: request.path,
                    query: request.query,
                    params: request.params,
                    body: this.sanitizeBody(request.body),
                },
                newData: {
                    statusCode: response.statusCode,
                    response: this.sanitizeResponse(data),
                    duration,
                },
                ipAddress: request.ip,
                userAgent: request.get('user-agent'),
            });
        }
        catch (error) {
            console.error('Audit logging failed:', error);
        }
    }
    shouldSkip(path) {
        const skippedPaths = [
            '/health',
            '/metrics',
            '/docs',
            '/admin',
            '/favicon.ico',
        ];
        return skippedPaths.some((skipPath) => path.startsWith(skipPath));
    }
    sanitizeBody(body) {
        if (!body || typeof body !== 'object')
            return body;
        const sanitized = {
            ...body,
        };
        const sensitiveFields = ['password', 'token', 'secret'];
        for (const field of sensitiveFields) {
            if (field in sanitized && sanitized[field] != null) {
                sanitized[field] = '***REDACTED***';
            }
        }
        return sanitized;
    }
    sanitizeResponse(response) {
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
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map