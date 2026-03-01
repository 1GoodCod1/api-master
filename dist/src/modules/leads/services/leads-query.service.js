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
exports.LeadsQueryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const id_encoder_1 = require("../../shared/utils/id-encoder");
const cursor_pagination_1 = require("../../shared/pagination/cursor-pagination");
let LeadsQueryService = class LeadsQueryService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findAll(authUser, options = {}) {
        if (authUser.role === 'CLIENT') {
            const userId = authUser.id;
            const phone = authUser.phone || '';
            return this.findAllForClient(userId, phone, options);
        }
        const masterId = authUser.masterProfile?.id;
        if (!masterId) {
            throw new common_1.BadRequestException('Master profile not found');
        }
        return this.findAllForMaster(masterId, options);
    }
    async findAllForMaster(masterId, options = {}) {
        const { status, limit: rawLimit = 20, cursor, page } = options;
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
        const cacheKey = this.cache.keys.masterLeads(masterId, status || null, page || 1);
        return this.cache.getOrSet(cacheKey, async () => {
            const baseWhere = { masterId };
            if (status)
                baseWhere.status = status;
            const queryParams = (0, cursor_pagination_1.buildCursorQuery)(baseWhere, cursor, page, limit);
            const [rawLeads, total] = await Promise.all([
                this.prisma.lead.findMany({
                    where: queryParams.where,
                    orderBy: queryParams.orderBy,
                    take: queryParams.take,
                    skip: queryParams.skip,
                    include: {
                        files: {
                            include: {
                                file: {
                                    select: {
                                        id: true,
                                        path: true,
                                        mimetype: true,
                                        filename: true,
                                    },
                                },
                            },
                        },
                        master: {
                            select: {
                                id: true,
                                slug: true,
                                user: { select: { firstName: true, lastName: true } },
                                category: { select: { id: true, name: true } },
                                city: { select: { id: true, name: true } },
                            },
                        },
                    },
                }),
                this.prisma.lead.count({ where: baseWhere }),
            ]);
            return (0, cursor_pagination_1.buildPaginatedResponse)(rawLeads, total, limit, queryParams.usedCursor);
        }, this.cache.ttl.leads);
    }
    async findAllForClient(userId, clientPhone, options = {}) {
        const { status, limit: rawLimit = 20, cursor, page } = options;
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
        const baseWhere = {
            OR: [{ clientId: userId }, { clientPhone }],
        };
        if (status)
            baseWhere.status = status;
        const queryParams = (0, cursor_pagination_1.buildCursorQuery)(baseWhere, cursor, page, limit);
        const [rawLeads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where: queryParams.where,
                orderBy: queryParams.orderBy,
                take: queryParams.take,
                skip: queryParams.skip,
                include: {
                    files: {
                        include: {
                            file: {
                                select: {
                                    id: true,
                                    path: true,
                                    mimetype: true,
                                    filename: true,
                                },
                            },
                        },
                    },
                    master: {
                        select: {
                            id: true,
                            slug: true,
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true,
                                    email: true,
                                },
                            },
                            category: { select: { id: true, name: true } },
                            city: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            this.prisma.lead.count({ where: baseWhere }),
        ]);
        return (0, cursor_pagination_1.buildPaginatedResponse)(rawLeads, total, limit, queryParams.usedCursor);
    }
    async findOne(idOrEncoded, authUser) {
        const decodedId = (0, id_encoder_1.decodeId)(idOrEncoded);
        const leadId = decodedId || idOrEncoded;
        const masterId = authUser.masterProfile?.id;
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                files: {
                    include: {
                        file: {
                            select: { id: true, path: true, mimetype: true, filename: true },
                        },
                    },
                },
                client: { select: { firstName: true, lastName: true } },
                master: {
                    select: {
                        id: true,
                        slug: true,
                        user: { select: { firstName: true, lastName: true } },
                        category: { select: { id: true, name: true } },
                        city: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        if (authUser.role === 'ADMIN')
            return lead;
        if (authUser.role === 'CLIENT') {
            if (lead.clientId !== authUser.id) {
                throw new common_1.ForbiddenException('Access denied');
            }
            return lead;
        }
        if (authUser.role === 'MASTER') {
            if (!masterId) {
                throw new common_1.BadRequestException('Master profile not found');
            }
            if (lead.masterId !== masterId) {
                throw new common_1.ForbiddenException('Access denied');
            }
            return lead;
        }
        throw new common_1.ForbiddenException('Access denied');
    }
    async getStats(authUser) {
        const masterId = authUser.masterProfile?.id;
        if (!masterId) {
            throw new common_1.BadRequestException('Master profile not found');
        }
        const [total, statusGroups] = await Promise.all([
            this.prisma.lead.count({ where: { masterId } }),
            this.prisma.lead.groupBy({
                by: ['status'],
                where: { masterId },
                _count: true,
            }),
        ]);
        const statusMap = {};
        for (const g of statusGroups) {
            statusMap[g.status] = g._count;
        }
        return {
            total,
            byStatus: {
                newLeads: statusMap['NEW'] || 0,
                inProgress: statusMap['IN_PROGRESS'] || 0,
                closed: statusMap[client_1.LeadStatus.CLOSED] || 0,
                spam: statusMap['SPAM'] || 0,
            },
        };
    }
};
exports.LeadsQueryService = LeadsQueryService;
exports.LeadsQueryService = LeadsQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], LeadsQueryService);
//# sourceMappingURL=leads-query.service.js.map