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
exports.PortfolioService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let PortfolioService = class PortfolioService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(masterId, serviceTag) {
        const where = {
            masterId,
            ...(serviceTag && { serviceTags: { has: serviceTag } }),
        };
        return this.prisma.portfolioItem.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                beforeFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
                afterFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
            },
        });
    }
    async findOne(id) {
        const item = await this.prisma.portfolioItem.findUnique({
            where: { id },
            include: {
                beforeFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
                afterFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
            },
        });
        if (!item)
            throw new common_1.NotFoundException('Portfolio item not found');
        return item;
    }
    async create(masterId, dto) {
        const [beforeFile, afterFile] = await Promise.all([
            this.prisma.file.findUnique({ where: { id: dto.beforeFileId } }),
            this.prisma.file.findUnique({ where: { id: dto.afterFileId } }),
        ]);
        if (!beforeFile)
            throw new common_1.BadRequestException('Before file not found');
        if (!afterFile)
            throw new common_1.BadRequestException('After file not found');
        const maxOrder = await this.prisma.portfolioItem.findFirst({
            where: { masterId },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        return this.prisma.portfolioItem.create({
            data: {
                masterId,
                title: dto.title,
                description: dto.description,
                beforeFileId: dto.beforeFileId,
                afterFileId: dto.afterFileId,
                serviceTags: dto.serviceTags ?? [],
                order: (maxOrder?.order ?? -1) + 1,
            },
            include: {
                beforeFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
                afterFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
            },
        });
    }
    async update(itemId, masterId, dto) {
        const item = await this.prisma.portfolioItem.findUnique({
            where: { id: itemId },
        });
        if (!item)
            throw new common_1.NotFoundException('Portfolio item not found');
        if (item.masterId !== masterId) {
            throw new common_1.ForbiddenException('You can only edit your own portfolio');
        }
        return this.prisma.portfolioItem.update({
            where: { id: itemId },
            data: {
                title: dto.title,
                description: dto.description,
                serviceTags: dto.serviceTags,
                order: dto.order,
            },
            include: {
                beforeFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
                afterFile: {
                    select: { id: true, filename: true, path: true, mimetype: true },
                },
            },
        });
    }
    async remove(itemId, masterId) {
        const item = await this.prisma.portfolioItem.findUnique({
            where: { id: itemId },
        });
        if (!item)
            throw new common_1.NotFoundException('Portfolio item not found');
        if (item.masterId !== masterId) {
            throw new common_1.ForbiddenException('You can only delete your own portfolio items');
        }
        await this.prisma.portfolioItem.delete({ where: { id: itemId } });
        return { deleted: true };
    }
    async reorder(masterId, dto) {
        const updates = dto.ids.map((id, index) => this.prisma.portfolioItem.updateMany({
            where: { id, masterId },
            data: { order: index },
        }));
        await this.prisma.$transaction(updates);
        return this.findAll(masterId);
    }
    async getServiceTags(masterId) {
        const items = await this.prisma.portfolioItem.findMany({
            where: { masterId },
            select: { serviceTags: true },
        });
        const allTags = items.flatMap((i) => i.serviceTags);
        return [...new Set(allTags)];
    }
};
exports.PortfolioService = PortfolioService;
exports.PortfolioService = PortfolioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortfolioService);
//# sourceMappingURL=portfolio.service.js.map