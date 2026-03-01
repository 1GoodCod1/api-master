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
var PromotionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const cache_service_1 = require("../shared/cache/cache.service");
const in_app_notification_service_1 = require("../notifications/services/in-app-notification.service");
let PromotionsService = PromotionsService_1 = class PromotionsService {
    prisma;
    cache;
    notifications;
    logger = new common_1.Logger(PromotionsService_1.name);
    constructor(prisma, cache, notifications) {
        this.prisma = prisma;
        this.cache = cache;
        this.notifications = notifications;
    }
    async getFixedServiceTitles(masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: { services: true },
        });
        const services = master?.services ?? [];
        return services
            .filter((s) => s?.priceType === 'FIXED' &&
            typeof s?.title === 'string' &&
            String(s.title).trim())
            .map((s) => String(s.title).trim());
    }
    async getServiceTitlesWithActivePromotion(masterId, excludePromotionId) {
        const now = new Date();
        const list = await this.prisma.promotion.findMany({
            where: {
                masterId,
                isActive: true,
                validFrom: { lte: now },
                validUntil: { gte: now },
                serviceTitle: { not: null },
                ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
            },
            select: { serviceTitle: true },
        });
        return list
            .map((p) => p.serviceTitle)
            .filter((t) => typeof t === 'string' && t.trim() !== '')
            .map((t) => t.trim());
    }
    async assertNoActivePromotionForService(masterId, serviceTitle, excludePromotionId) {
        const now = new Date();
        const existing = await this.prisma.promotion.findFirst({
            where: {
                masterId,
                isActive: true,
                validFrom: { lte: now },
                validUntil: { gte: now },
                serviceTitle: serviceTitle.trim(),
                ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
            },
        });
        if (existing) {
            throw new common_1.ConflictException('На эту услугу уже действует акция. Создайте акцию на другую услугу или дождитесь окончания текущей.');
        }
    }
    async assertCanCreateOrUpdatePromotion(masterId, serviceTitle, excludePromotionId) {
        const fixedTitles = await this.getFixedServiceTitles(masterId);
        const takenTitles = await this.getServiceTitlesWithActivePromotion(masterId, excludePromotionId);
        if (serviceTitle) {
            const title = serviceTitle.trim();
            if (!fixedTitles.includes(title)) {
                throw new common_1.BadRequestException('Акцию можно применять только к услугам с фиксированной ценой. Этой услуги нет в списке или у неё договорная цена.');
            }
            await this.assertNoActivePromotionForService(masterId, title, excludePromotionId);
            return;
        }
        const fixedWithoutPromotion = fixedTitles.filter((t) => !takenTitles.includes(t));
        if (fixedWithoutPromotion.length === 0) {
            throw new common_1.ConflictException('Нельзя применить акцию ко всем услугам: на все услуги с фиксированной ценой уже действуют акции. Создайте акцию на одну конкретную услугу или дождитесь окончания текущих.');
        }
    }
    async create(masterId, dto) {
        const serviceTitle = dto.serviceTitle?.trim() || null;
        await this.assertCanCreateOrUpdatePromotion(masterId, serviceTitle);
        const promotion = await this.prisma.promotion.create({
            data: {
                masterId,
                title: dto.title,
                description: dto.description,
                discount: dto.discount,
                serviceTitle: dto.serviceTitle?.trim() || null,
                validFrom: new Date(dto.validFrom),
                validUntil: new Date(dto.validUntil),
                isActive: dto.isActive ?? true,
            },
            include: {
                master: {
                    select: {
                        user: { select: { firstName: true, lastName: true } },
                        city: { select: { name: true } },
                        category: { select: { name: true } },
                    },
                },
            },
        });
        const interestedClients = await this.prisma.favorite.findMany({
            where: { masterId },
            select: { userId: true },
        });
        const masterName = promotion.master.user.firstName || 'Мастер';
        for (const fav of interestedClients) {
            await this.notifications
                .notifyNewPromotion(fav.userId, {
                masterId,
                masterName,
                promotionId: promotion.id,
                discount: promotion.discount,
            })
                .catch((e) => this.logger.error(`Failed to notify user ${fav.userId}`, e));
        }
        await this.invalidatePromotionCache();
        return promotion;
    }
    async findMyPromotions(masterId) {
        return this.prisma.promotion.findMany({
            where: { masterId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, masterId, dto) {
        const promotion = await this.prisma.promotion.findUnique({ where: { id } });
        if (!promotion)
            throw new common_1.NotFoundException('Акция не найдена');
        if (promotion.masterId !== masterId)
            throw new common_1.ForbiddenException('Нет доступа');
        const newServiceTitle = dto.serviceTitle !== undefined
            ? dto.serviceTitle?.trim() || null
            : promotion.serviceTitle;
        await this.assertCanCreateOrUpdatePromotion(masterId, newServiceTitle, id);
        const updated = await this.prisma.promotion.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.discount !== undefined && { discount: dto.discount }),
                ...(dto.serviceTitle !== undefined && {
                    serviceTitle: dto.serviceTitle?.trim() || null,
                }),
                ...(dto.validFrom !== undefined && {
                    validFrom: new Date(dto.validFrom),
                }),
                ...(dto.validUntil !== undefined && {
                    validUntil: new Date(dto.validUntil),
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
        await this.invalidatePromotionCache();
        return updated;
    }
    async remove(id, masterId) {
        const promotion = await this.prisma.promotion.findUnique({ where: { id } });
        if (!promotion)
            throw new common_1.NotFoundException('Акция не найдена');
        if (promotion.masterId !== masterId)
            throw new common_1.ForbiddenException('Нет доступа');
        await this.prisma.promotion.delete({ where: { id } });
        await this.invalidatePromotionCache();
        return { deleted: true };
    }
    async findActivePromotions(limit = 10) {
        const cacheKey = `cache:promotions:active:limit:${limit}`;
        return this.cache.getOrSet(cacheKey, async () => {
            const now = new Date();
            return this.prisma.promotion.findMany({
                where: {
                    isActive: true,
                    validFrom: { lte: now },
                    validUntil: { gte: now },
                    master: { user: { isVerified: true } },
                },
                include: {
                    master: {
                        select: {
                            id: true,
                            slug: true,
                            rating: true,
                            totalReviews: true,
                            avatarFileId: true,
                            user: { select: { firstName: true, lastName: true } },
                            city: { select: { name: true } },
                            category: { select: { name: true } },
                            photos: {
                                select: { file: { select: { path: true } } },
                                take: 1,
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
                orderBy: { discount: 'desc' },
                take: limit,
            });
        }, 300);
    }
    async findActivePromotionsForMaster(masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: { user: { select: { isVerified: true } } },
        });
        if (!master || !master.user?.isVerified) {
            return [];
        }
        const now = new Date();
        return this.prisma.promotion.findMany({
            where: {
                masterId,
                isActive: true,
                validFrom: { lte: now },
                validUntil: { gte: now },
            },
            orderBy: { discount: 'desc' },
        });
    }
    async invalidatePromotionCache() {
        await this.cache.invalidate('cache:promotions:*');
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = PromotionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        in_app_notification_service_1.InAppNotificationService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map