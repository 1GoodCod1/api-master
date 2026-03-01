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
exports.AuditMiddleware = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../modules/audit/audit.service");
let AuditMiddleware = class AuditMiddleware {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    use(req, res, next) {
        const user = req.user;
        if (this.shouldSkip(req.path)) {
            return next();
        }
        const oldWrite = res.write.bind(res);
        const oldEnd = res.end.bind(res);
        const chunks = [];
        const auditService = this.auditService;
        const sanitizeBody = this.sanitizeBody.bind(this);
        const sanitizeResponse = this.sanitizeResponse.bind(this);
        res.write = function (chunk, ...args) {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return oldWrite(chunk, ...args);
        };
        res.end = function (chunk, ...args) {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
                            query: req.query,
                            params: req.params,
                            body: sanitizeBody(req.body),
                        },
                        newData: {
                            statusCode: res.statusCode,
                            response: sanitizeResponse(responseBody),
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent'),
                    });
                }
                catch (error) {
                    console.error('Audit logging failed:', error);
                }
            });
            return oldEnd(chunk, ...args);
        };
        next();
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
    sanitizeResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return this.sanitizeBody(parsed);
        }
        catch {
            return response.substring(0, 100);
        }
    }
};
exports.AuditMiddleware = AuditMiddleware;
exports.AuditMiddleware = AuditMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditMiddleware);
//# sourceMappingURL=audit.middleware.js.map