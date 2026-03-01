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
exports.AdminMastersService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const createdAtIdCursor_1 = require("../../shared/pagination/createdAtIdCursor");
let AdminMastersService = class AdminMastersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMasters(filters) {
        const { verified, featured, tariff, page = 1, limit = 20, cursor, } = filters || {};
        const limitNumber = Number(limit) || 20;
        const where = {
            user: {
                isBanned: false,
                ...(verified !== undefined ? { isVerified: verified } : {}),
            },
        };
        if (featured !== undefined)
            where.isFeatured = featured;
        if (tariff)
            where.tariffType = tariff;
        const cursorDecoded = (0, createdAtIdCursor_1.decodeCreatedAtIdCursor)(cursor);
        const useCursor = Boolean(cursor && cursorDecoded);
        const whereWithCursor = useCursor
            ? (0, createdAtIdCursor_1.buildCreatedAtIdCursorWhereDesc)(where, cursorDecoded)
            : where;
        const orderBy = [
            { createdAt: 'desc' },
            { id: 'desc' },
        ];
        const [rawMasters, total] = await Promise.all([
            this.prisma.master.findMany({
                where: whereWithCursor,
                include: {
                    user: {
                        select: {
                            email: true,
                            phone: true,
                            isVerified: true,
                        },
                    },
                    category: true,
                    city: true,
                    _count: {
                        select: {
                            leads: true,
                            reviews: {
                                where: { status: constants_1.ReviewStatus.VISIBLE },
                            },
                        },
                    },
                },
                orderBy,
                ...(useCursor
                    ? { take: limitNumber + 1 }
                    : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
            }),
            this.prisma.master.count({ where }),
        ]);
        const masters = useCursor ? rawMasters.slice(0, limitNumber) : rawMasters;
        const nextCursor = useCursor && rawMasters.length > limitNumber
            ? (0, createdAtIdCursor_1.nextCursorFromLastCreatedAtId)(masters)
            : null;
        const mastersWithLifetime = masters.map((master) => ({
            ...master,
            lifetimePremium: master.lifetimePremium,
        }));
        return {
            masters: mastersWithLifetime,
            pagination: {
                total,
                page: useCursor ? 1 : page,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
                nextCursor,
            },
        };
    }
    async updateMaster(masterId, data) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
        });
        if (!master) {
            throw new common_1.NotFoundException('Master not found');
        }
        const updateData = {};
        if (data.isFeatured !== undefined)
            updateData.isFeatured = data.isFeatured;
        if (data.tariffType !== undefined) {
            updateData.tariffType = data.tariffType;
        }
        return this.prisma.master.update({
            where: { id: masterId },
            data: updateData,
        });
    }
    async getRecentMasters(limit = 10) {
        return this.prisma.master.findMany({
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                    },
                },
                category: true,
                city: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.AdminMastersService = AdminMastersService;
exports.AdminMastersService = AdminMastersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminMastersService);
//# sourceMappingURL=admin-masters.service.js.map