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
exports.NotificationsQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cursor_pagination_1 = require("../../shared/pagination/cursor-pagination");
let NotificationsQueryService = class NotificationsQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserNotifications(userId, options) {
        const { page, limit: rawLimit = 50, cursor, unreadOnly, category, type, } = options;
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 50));
        const baseWhere = { userId };
        if (unreadOnly) {
            baseWhere.readAt = null;
        }
        if (category) {
            baseWhere.category = category;
        }
        if (type) {
            baseWhere.type = type;
        }
        const queryParams = (0, cursor_pagination_1.buildCursorQuery)(baseWhere, cursor, page, limit);
        const [rawNotifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: queryParams.where,
                orderBy: queryParams.orderBy,
                take: queryParams.take,
                skip: queryParams.skip,
            }),
            this.prisma.notification.count({ where: baseWhere }),
        ]);
        const paginated = (0, cursor_pagination_1.buildPaginatedResponse)(rawNotifications, total, limit, queryParams.usedCursor);
        return {
            data: paginated.items,
            meta: paginated.meta,
        };
    }
    async getUnreadCount(userId) {
        const [total, byCategory] = await Promise.all([
            this.prisma.notification.count({
                where: { userId, readAt: null },
            }),
            this.prisma.$queryRaw `
        SELECT category, COUNT(*) as count
        FROM notifications
        WHERE "userId" = ${userId} AND "readAt" IS NULL AND category IS NOT NULL
        GROUP BY category
      `,
        ]);
        const categoryCounts = {};
        for (const row of byCategory) {
            if (row.category) {
                categoryCounts[row.category] = Number(row.count);
            }
        }
        return { count: total, byCategory: categoryCounts };
    }
};
exports.NotificationsQueryService = NotificationsQueryService;
exports.NotificationsQueryService = NotificationsQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsQueryService);
//# sourceMappingURL=notifications-query.service.js.map