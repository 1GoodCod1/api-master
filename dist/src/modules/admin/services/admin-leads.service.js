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
exports.AdminLeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const createdAtIdCursor_1 = require("../../shared/pagination/createdAtIdCursor");
let AdminLeadsService = class AdminLeadsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(filters) {
        const { status, dateFrom, dateTo, page = 1, limit = 50, cursor, } = filters || {};
        const limitNumber = Number(limit) || 50;
        const where = {};
        if (status)
            where.status = status;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = dateFrom;
            if (dateTo)
                where.createdAt.lte = dateTo;
        }
        const cursorDecoded = (0, createdAtIdCursor_1.decodeCreatedAtIdCursor)(cursor);
        const useCursor = Boolean(cursor && cursorDecoded);
        const whereWithCursor = useCursor
            ? (0, createdAtIdCursor_1.buildCreatedAtIdCursorWhereDesc)(where, cursorDecoded)
            : where;
        const orderBy = [
            { createdAt: 'desc' },
            { id: 'desc' },
        ];
        const [rawLeads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where: whereWithCursor,
                include: {
                    master: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
                orderBy,
                ...(useCursor
                    ? { take: limitNumber + 1 }
                    : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
            }),
            this.prisma.lead.count({ where }),
        ]);
        const leads = useCursor ? rawLeads.slice(0, limitNumber) : rawLeads;
        const nextCursor = useCursor && rawLeads.length > limitNumber
            ? (0, createdAtIdCursor_1.nextCursorFromLastCreatedAtId)(leads)
            : null;
        return {
            leads,
            pagination: {
                total,
                page: useCursor ? 1 : page,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
                nextCursor,
            },
        };
    }
    async getRecentLeads(limit = 10) {
        return this.prisma.lead.findMany({
            include: {
                master: {
                    select: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.AdminLeadsService = AdminLeadsService;
exports.AdminLeadsService = AdminLeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminLeadsService);
//# sourceMappingURL=admin-leads.service.js.map