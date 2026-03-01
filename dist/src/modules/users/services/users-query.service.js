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
exports.UsersQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let UsersQueryService = class UsersQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async count(filters = {}) {
        return this.prisma.user.count({ where: filters });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                masterProfile: {
                    include: {
                        category: true,
                        city: true,
                    },
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                notifications: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        const { password, ...result } = user;
        return result;
    }
    async getStatistics() {
        const [totalUsers, mastersCount, adminsCount, verifiedCount, bannedCount, todayRegistrations, weekRegistrations, monthRegistrations, activeToday,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: 'MASTER' } }),
            this.prisma.user.count({ where: { role: 'ADMIN' } }),
            this.prisma.user.count({ where: { isVerified: true } }),
            this.prisma.user.count({ where: { isBanned: true } }),
            this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            this.prisma.user.count({
                where: {
                    lastLoginAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);
        return {
            totalUsers,
            byRole: {
                masters: mastersCount,
                admins: adminsCount,
                guests: totalUsers - mastersCount - adminsCount,
            },
            byStatus: {
                verified: verifiedCount,
                banned: bannedCount,
            },
            registrations: {
                today: todayRegistrations,
                week: weekRegistrations,
                month: monthRegistrations,
            },
            activeToday,
        };
    }
    async getMyPhotos(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, avatarFileId: true },
        });
        if (!user || user.role !== 'CLIENT') {
            throw new common_1.NotFoundException('Профиль клиента не найден');
        }
        const rows = await this.prisma.clientPhoto.findMany({
            where: { userId: user.id },
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
            take: 10,
            include: { file: true },
        });
        return {
            avatarFileId: user.avatarFileId ?? null,
            items: rows.map((r) => r.file),
        };
    }
};
exports.UsersQueryService = UsersQueryService;
exports.UsersQueryService = UsersQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersQueryService);
//# sourceMappingURL=users-query.service.js.map