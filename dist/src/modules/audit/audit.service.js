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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const redis_service_1 = require("../shared/redis/redis.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    redis;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async log(data) {
        try {
            if (data.userId) {
                const userExists = await this.prisma.user.findUnique({
                    where: { id: data.userId },
                    select: { id: true },
                });
                if (!userExists) {
                    data.userId = null;
                }
            }
            const log = await this.prisma.auditLog.create({
                data: {
                    userId: data.userId || null,
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    oldData: data.oldData,
                    newData: data.newData,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
            try {
                await this.redis
                    .getClient()
                    .xadd('audit:stream', '*', 'action', data.action, 'userId', data.userId || 'system', 'entityType', data.entityType || '', 'entityId', data.entityId || '', 'timestamp', new Date().toISOString());
            }
            catch {
                this.logger.debug('Redis Streams not available for audit logging');
            }
            const securityEvents = [
                'USER_BANNED',
                'USER_UNBANNED',
                'IP_BLACKLISTED',
                'SUSPICIOUS_SCORE_INCREASED',
                'LOGIN_FAILED',
                'PHONE_VERIFIED',
            ];
            if (securityEvents.includes(data.action)) {
                this.logger.warn(`[SECURITY] ${data.action}`, {
                    userId: data.userId,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    ipAddress: data.ipAddress,
                    details: data.newData,
                });
            }
            return log;
        }
        catch (error) {
            this.logger.error('Failed to save audit log:', error);
        }
    }
    async getLogs(filters) {
        const { userId, action, entityType, startDate, endDate, page = 1, limit = 50, } = filters || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (userId)
            where.userId = userId;
        if (action)
            where.action = action;
        if (entityType)
            where.entityType = entityType;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            email: true,
                            phone: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getRecentStream(limit = 100) {
        try {
            const redis = this.redis.getClient();
            const stream = await redis.xrevrange('audit:stream', '+', '-', 'COUNT', limit);
            return {
                items: stream.map(([id, fields]) => {
                    const entry = { id };
                    for (let i = 0; i < fields.length; i += 2) {
                        entry[fields[i]] = fields[i + 1];
                    }
                    return entry;
                }),
            };
        }
        catch {
            this.logger.warn('Redis Streams not available, falling back to database');
            const logs = await this.prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            email: true,
                            role: true,
                        },
                    },
                },
            });
            return {
                items: logs.map((log) => ({
                    id: log.id,
                    action: log.action,
                    entity: log.entityType,
                    entityId: log.entityId,
                    actorId: log.userId,
                    ip: log.ipAddress,
                    ua: log.userAgent,
                    createdAt: log.createdAt.toISOString(),
                    user: log.user,
                })),
            };
        }
    }
    async getStats(timeframe = 'day') {
        const now = new Date();
        let startDate;
        switch (timeframe) {
            case 'day':
                startDate = new Date(now.setDate(now.getDate() - 1));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        const [totalLogs, byAction, byUser] = await Promise.all([
            this.prisma.auditLog.count({
                where: { createdAt: { gte: startDate } },
            }),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                _count: true,
                where: { createdAt: { gte: startDate } },
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),
            this.prisma.auditLog.groupBy({
                by: ['userId'],
                _count: true,
                where: { createdAt: { gte: startDate }, userId: { not: null } },
                orderBy: { _count: { userId: 'desc' } },
                take: 10,
            }),
        ]);
        return {
            timeframe,
            totalLogs,
            byAction: byAction.map((item) => ({
                action: item.action,
                count: item._count,
            })),
            byUser,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AuditService);
//# sourceMappingURL=audit.service.js.map