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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../shared/database/prisma.service");
const plans_1 = require("../../common/helpers/plans");
const file_magic_1 = require("../shared/utils/file-magic");
let FilesService = class FilesService {
    configService;
    prisma;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
    }
    isImage(mimetype) {
        return String(mimetype || '').startsWith('image/');
    }
    async addToMasterGalleryIfPossible(userId, fileId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            include: { user: { select: { isVerified: true } } },
        });
        if (!master)
            return null;
        if (!master.user.isVerified) {
            return null;
        }
        const exists = await this.prisma.masterPhoto.findUnique({
            where: { masterId_fileId: { masterId: master.id, fileId } },
        });
        if (exists)
            return master;
        const tariff = (0, plans_1.getEffectiveTariff)(master);
        const baseLimit = this.getPhotoLimitForTariff(tariff);
        const extraPhotos = master.extraPhotosCount || 0;
        const totalLimit = baseLimit + extraPhotos;
        const count = await this.prisma.masterPhoto.count({
            where: { masterId: master.id },
        });
        if (count >= totalLimit) {
            throw new common_1.BadRequestException(`Photo limit reached for your plan (${count}/${totalLimit}). Upgrade your plan or buy extra photos to add more.`);
        }
        const maxOrderRow = await this.prisma.masterPhoto.findFirst({
            where: { masterId: master.id },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const nextOrder = (maxOrderRow?.order ?? 0) + 1;
        await this.prisma.masterPhoto.create({
            data: { masterId: master.id, fileId, order: nextOrder },
        });
        return master;
    }
    async addToClientGalleryIfPossible(userId, fileId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, avatarFileId: true },
        });
        if (!user || user.role !== 'CLIENT')
            return null;
        const exists = await this.prisma.clientPhoto.findUnique({
            where: { userId_fileId: { userId: user.id, fileId } },
        });
        if (exists)
            return user;
        const CLIENT_PHOTO_LIMIT = 10;
        const count = await this.prisma.clientPhoto.count({
            where: { userId: user.id },
        });
        if (count >= CLIENT_PHOTO_LIMIT) {
            return user;
        }
        const maxOrderRow = await this.prisma.clientPhoto.findFirst({
            where: { userId: user.id },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const nextOrder = (maxOrderRow?.order ?? 0) + 1;
        await this.prisma.clientPhoto.create({
            data: { userId: user.id, fileId, order: nextOrder },
        });
        return user;
    }
    async uploadFile(file, userId, options) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        if (file.path) {
            try {
                await (0, file_magic_1.validateFileMagic)(file.path, file.originalname);
            }
            catch (e) {
                await (0, file_magic_1.unlinkIfExists)(file.path);
                throw new common_1.BadRequestException(e instanceof Error ? e.message : 'Invalid file content');
            }
        }
        let fileUrl = file.location ||
            file.path ||
            '';
        if (fileUrl && !String(fileUrl).startsWith('http')) {
            const normalized = String(fileUrl).replace(/\\/g, '/');
            if (normalized.startsWith('uploads/'))
                fileUrl = '/' + normalized;
            const idx = normalized.lastIndexOf('/uploads/');
            if (idx !== -1)
                fileUrl = normalized.slice(idx);
        }
        const fileRecord = await this.prisma.file.create({
            data: {
                filename: file.originalname,
                path: fileUrl,
                mimetype: file.mimetype,
                size: file.size,
                uploadedById: userId,
            },
        });
        try {
            if (userId && this.isImage(fileRecord.mimetype)) {
                const master = await this.addToMasterGalleryIfPossible(userId, fileRecord.id);
                if (master && !master.avatarFileId) {
                    await this.prisma.master.update({
                        where: { id: master.id },
                        data: { avatarFileId: fileRecord.id },
                    });
                }
                const client = options?.skipClientGallery !== true
                    ? await this.addToClientGalleryIfPossible(userId, fileRecord.id)
                    : null;
                if (client && !client.avatarFileId) {
                    await this.prisma.user.update({
                        where: { id: client.id },
                        data: { avatarFileId: fileRecord.id },
                    });
                }
            }
        }
        catch (e) {
            await this.prisma.file
                .delete({ where: { id: fileRecord.id } })
                .catch(() => { });
            throw e;
        }
        return {
            id: fileRecord.id,
            path: fileUrl,
            url: fileUrl,
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        };
    }
    async uploadMany(files, userId, options) {
        if (!Array.isArray(files) || files.length === 0)
            return { items: [] };
        if (files.length > 10)
            throw new common_1.BadRequestException('Maximum 10 files allowed');
        const items = [];
        for (const f of files) {
            const saved = await this.uploadFile(f, userId ?? undefined, options);
            const item = typeof saved === 'object' && saved !== null && 'data' in saved
                ? saved.data
                : saved;
            items.push(item);
        }
        return { items };
    }
    getPhotoLimitForTariff(t) {
        if (t === 'BASIC')
            return 5;
        if (t === 'VIP')
            return 10;
        return 15;
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], FilesService);
//# sourceMappingURL=files.service.js.map