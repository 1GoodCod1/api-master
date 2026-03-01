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
exports.MastersPhotosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let MastersPhotosService = class MastersPhotosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMasterPhotos(masterIdOrSlug, limit = 15) {
        let m = await this.prisma.master.findUnique({
            where: { slug: masterIdOrSlug },
            select: {
                id: true,
                avatarFileId: true,
                photos: {
                    orderBy: { createdAt: 'desc' },
                    take: Math.min(15, Math.max(1, Number(limit) || 15)),
                    select: {
                        file: true,
                    },
                },
            },
        });
        if (!m) {
            m = await this.prisma.master.findUnique({
                where: { id: masterIdOrSlug },
                select: {
                    id: true,
                    avatarFileId: true,
                    photos: {
                        orderBy: { createdAt: 'desc' },
                        take: Math.min(15, Math.max(1, Number(limit) || 15)),
                        select: {
                            file: true,
                        },
                    },
                },
            });
        }
        if (!m)
            throw new common_1.NotFoundException('Master not found');
        return {
            avatarFileId: m.avatarFileId ?? null,
            items: m.photos.map((p) => p.file),
        };
    }
    async getMyPhotos(userId) {
        const master = await this.prisma.master.findUnique({ where: { userId } });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const rows = await this.prisma.masterPhoto.findMany({
            where: { masterId: master.id },
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
            take: 15,
            include: { file: true },
        });
        return {
            avatarFileId: master.avatarFileId ?? null,
            items: rows.map((r) => r.file),
        };
    }
    async removeMyPhoto(userId, fileId, onCacheInvalidate) {
        const master = await this.prisma.master.findUnique({ where: { userId } });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        await this.prisma.masterPhoto.deleteMany({
            where: { masterId: master.id, fileId },
        });
        if (onCacheInvalidate) {
            await onCacheInvalidate(master.id, master.slug);
        }
        if (master.avatarFileId === fileId) {
            await this.prisma.master.update({
                where: { id: master.id },
                data: { avatarFileId: null },
            });
        }
        return { ok: true };
    }
    async setMyAvatar(userId, fileId, onCacheInvalidate) {
        const master = await this.prisma.master.findUnique({ where: { userId } });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const file = await this.prisma.file.findUnique({ where: { id: fileId } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        if (file.uploadedById !== userId)
            throw new common_1.BadRequestException('You can only use your own file as avatar');
        if (!String(file.mimetype).startsWith('image/'))
            throw new common_1.BadRequestException('Avatar must be an image');
        const count = await this.prisma.masterPhoto.count({
            where: { masterId: master.id },
        });
        const exists = await this.prisma.masterPhoto.findUnique({
            where: { masterId_fileId: { masterId: master.id, fileId } },
        });
        if (!exists) {
            if (count >= 15)
                throw new common_1.BadRequestException('Gallery limit reached (15)');
            await this.prisma.masterPhoto.create({
                data: { masterId: master.id, fileId, order: 0 },
            });
        }
        await this.prisma.master.update({
            where: { id: master.id },
            data: { avatarFileId: fileId },
        });
        if (onCacheInvalidate) {
            await onCacheInvalidate(master.id, master.slug);
        }
        return { ok: true };
    }
};
exports.MastersPhotosService = MastersPhotosService;
exports.MastersPhotosService = MastersPhotosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MastersPhotosService);
//# sourceMappingURL=masters-photos.service.js.map