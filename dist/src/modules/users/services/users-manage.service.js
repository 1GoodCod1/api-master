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
exports.UsersManageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
let UsersManageService = class UsersManageService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async update(id, updateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });
    }
    async remove(id) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
    async toggleBan(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        const updated = await this.prisma.user.update({
            where: { id },
            data: { isBanned: !user.isBanned },
        });
        await this.invalidateCache(id);
        return updated;
    }
    async toggleVerify(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { masterProfile: { select: { id: true } } },
        });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        const newVerified = !user.isVerified;
        const updated = await this.prisma.user.update({
            where: { id },
            data: { isVerified: newVerified },
        });
        if (newVerified && user.role === 'MASTER' && user.masterProfile) {
            await this.prisma.master.update({
                where: { id: user.masterProfile.id },
                data: { pendingVerification: false },
            });
        }
        await this.invalidateCache(id);
        return updated;
    }
    async setAvatar(userId, fileId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, avatarFileId: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (!fileId || fileId.trim() === '') {
            await this.prisma.user.update({
                where: { id: userId },
                data: { avatarFileId: null },
            });
            return this.getUpdatedUser(userId);
        }
        const file = await this.prisma.file.findUnique({ where: { id: fileId } });
        if (!file)
            throw new common_1.NotFoundException('Файл не найден');
        if (file.uploadedById !== userId) {
            throw new common_1.BadRequestException('Вы можете использовать только свои собственные файлы в качестве аватара');
        }
        if (!String(file.mimetype).startsWith('image/')) {
            throw new common_1.BadRequestException('Аватар должен быть изображением');
        }
        if (user.role === 'CLIENT') {
            await this.saveClientPhoto(user.id, fileId);
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarFileId: fileId },
        });
        return this.getUpdatedUser(userId);
    }
    async removeMyPhoto(userId, fileId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, avatarFileId: true },
        });
        if (!user || user.role !== 'CLIENT') {
            throw new common_1.NotFoundException('Профиль клиента не найден');
        }
        await this.prisma.clientPhoto.deleteMany({
            where: { userId: user.id, fileId },
        });
        if (user.avatarFileId === fileId) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { avatarFileId: null },
            });
        }
        return { ok: true };
    }
    async saveClientPhoto(userId, fileId) {
        const exists = await this.prisma.clientPhoto.findUnique({
            where: { userId_fileId: { userId, fileId } },
        });
        if (!exists) {
            const count = await this.prisma.clientPhoto.count({
                where: { userId },
            });
            if (count < 10) {
                const maxOrderRow = await this.prisma.clientPhoto.findFirst({
                    where: { userId },
                    orderBy: { order: 'desc' },
                    select: { order: true },
                });
                const nextOrder = (maxOrderRow?.order ?? 0) + 1;
                await this.prisma.clientPhoto.create({
                    data: { userId, fileId, order: nextOrder },
                });
            }
        }
    }
    async getUpdatedUser(userId) {
        const updatedUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                role: true,
                isVerified: true,
                isBanned: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                avatarFile: {
                    select: {
                        id: true,
                        path: true,
                        filename: true,
                    },
                },
            },
        });
        return {
            user: updatedUser,
        };
    }
    async invalidateCache(userId) {
        await this.cache.del(this.cache.keys.userMasterProfile(userId));
        await this.cache.del(this.cache.keys.userProfile(userId));
    }
};
exports.UsersManageService = UsersManageService;
exports.UsersManageService = UsersManageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], UsersManageService);
//# sourceMappingURL=users-manage.service.js.map