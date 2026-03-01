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
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const createdAtIdCursor_1 = require("../../shared/pagination/createdAtIdCursor");
let AdminUsersService = class AdminUsersService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async getUsers(filters) {
        const { role, verified, banned, page = 1, limit = 20, cursor, } = filters || {};
        let verifiedBoolean;
        if (verified !== undefined && verified !== null) {
            if (typeof verified === 'string') {
                verifiedBoolean = verified === 'true';
            }
            else {
                verifiedBoolean = verified;
            }
        }
        let bannedBoolean;
        if (banned !== undefined && banned !== null) {
            if (typeof banned === 'string') {
                bannedBoolean = banned === 'true';
            }
            else {
                bannedBoolean = banned;
            }
        }
        const pageNumber = Number(page) || 1;
        const limitNumber = Number(limit) || 20;
        const where = {};
        if (role)
            where.role = role;
        if (verifiedBoolean !== undefined)
            where.isVerified = verifiedBoolean;
        if (bannedBoolean !== undefined)
            where.isBanned = bannedBoolean;
        const cursorDecoded = (0, createdAtIdCursor_1.decodeCreatedAtIdCursor)(cursor);
        const useCursor = Boolean(cursor && cursorDecoded);
        const whereWithCursor = useCursor
            ? (0, createdAtIdCursor_1.buildCreatedAtIdCursorWhereDesc)(where, cursorDecoded)
            : where;
        const select = {
            id: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            isBanned: true,
            lastLoginAt: true,
            createdAt: true,
            avatarFile: {
                select: {
                    id: true,
                    path: true,
                    filename: true,
                },
            },
            masterProfile: {
                select: {
                    id: true,
                    tariffType: true,
                    tariffExpiresAt: true,
                    views: true,
                    rating: true,
                    experienceYears: true,
                    avatarFile: {
                        select: {
                            id: true,
                            path: true,
                            filename: true,
                        },
                    },
                    category: { select: { name: true } },
                    city: { select: { name: true } },
                },
            },
        };
        const orderBy = [
            { createdAt: 'desc' },
            { id: 'desc' },
        ];
        const [rawUsers, total] = await Promise.all([
            this.prisma.user.findMany({
                where: whereWithCursor,
                select,
                orderBy,
                ...(useCursor
                    ? { take: limitNumber + 1 }
                    : { skip: (pageNumber - 1) * limitNumber, take: limitNumber }),
            }),
            this.prisma.user.count({ where }),
        ]);
        const users = useCursor ? rawUsers.slice(0, limitNumber) : rawUsers;
        const nextCursor = useCursor && rawUsers.length > limitNumber
            ? (0, createdAtIdCursor_1.nextCursorFromLastCreatedAtId)(users)
            : null;
        return {
            users,
            pagination: {
                total,
                page: useCursor ? 1 : page,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
                nextCursor,
            },
        };
    }
    async updateUser(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updateData = {};
        if (data.isVerified !== undefined)
            updateData.isVerified = data.isVerified;
        if (data.isBanned !== undefined)
            updateData.isBanned = data.isBanned;
        if (data.role !== undefined) {
            updateData.role = data.role;
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
        if (Object.keys(updateData).length > 0) {
            await this.cache.del(this.cache.keys.userMasterProfile(userId));
            await this.cache.del(this.cache.keys.userProfile(userId));
        }
        return updated;
    }
    async getRecentUsers(limit = 10) {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                phone: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map