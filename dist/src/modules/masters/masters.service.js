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
exports.MastersService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const cache_service_1 = require("../shared/cache/cache.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const activity_events_1 = require("../recommendations/events/activity.events");
const masters_search_service_1 = require("./services/masters-search.service");
const masters_profile_service_1 = require("./services/masters-profile.service");
const masters_photos_service_1 = require("./services/masters-photos.service");
const masters_stats_service_1 = require("./services/masters-stats.service");
const masters_tariff_service_1 = require("./services/masters-tariff.service");
const id_encoder_1 = require("../shared/utils/id-encoder");
const plans_1 = require("../../common/helpers/plans");
let MastersService = class MastersService {
    prisma;
    cache;
    searchService;
    profileService;
    photosService;
    statsService;
    tariffService;
    eventEmitter;
    constructor(prisma, cache, searchService, profileService, photosService, statsService, tariffService, eventEmitter) {
        this.prisma = prisma;
        this.cache = cache;
        this.searchService = searchService;
        this.profileService = profileService;
        this.photosService = photosService;
        this.statsService = statsService;
        this.tariffService = tariffService;
        this.eventEmitter = eventEmitter;
    }
    async findAll(searchDto) {
        return this.searchService.findAll(searchDto);
    }
    async getSearchFilters() {
        return this.searchService.getSearchFilters();
    }
    async getPopularMasters(limit = 10) {
        return this.searchService.getPopularMasters(limit);
    }
    async getNewMasters(limit = 10) {
        return this.searchService.getNewMasters(limit);
    }
    async findOne(slugOrId, req, incrementViews = false) {
        const decodedId = (0, id_encoder_1.decodeId)(slugOrId);
        const identifier = decodedId || slugOrId;
        const userId = req.user?.id;
        const reqWithSession = req;
        const sessionId = reqWithSession.sessionID ||
            req.headers['x-session-id'];
        const ipAddress = req.ip ||
            req.headers['x-forwarded-for'] ||
            req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const onViewIncrement = (masterId, uid, sid, ip, ua, catId, cityId) => this.handleViewIncrement(masterId, uid, sid, ip, ua, catId, cityId);
        return this.profileService.findOne(identifier, incrementViews, userId, sessionId, ipAddress, userAgent, undefined, undefined, onViewIncrement);
    }
    async getProfile(userId) {
        return this.profileService.getProfile(userId);
    }
    async updateProfile(userId, updateDto, isVerified = true) {
        return this.profileService.updateProfile(userId, updateDto, isVerified);
    }
    async getNotificationSettings(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: {
                telegramChatId: true,
                whatsappPhone: true,
            },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        return master;
    }
    async updateNotificationSettings(userId, dto) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const data = {};
        if (dto.telegramChatId !== undefined)
            data.telegramChatId = dto.telegramChatId;
        if (dto.whatsappPhone !== undefined)
            data.whatsappPhone = dto.whatsappPhone;
        return this.prisma.master.update({
            where: { userId },
            data,
        });
    }
    async getScheduleSettings(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: {
                workStartHour: true,
                workEndHour: true,
                slotDurationMinutes: true,
            },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        return master;
    }
    async updateScheduleSettings(userId, dto) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true, workStartHour: true, workEndHour: true, slug: true },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const startHour = dto.workStartHour ?? master.workStartHour;
        const endHour = dto.workEndHour ?? master.workEndHour;
        if (startHour >= endHour) {
            throw new common_1.ForbiddenException('Work start hour must be less than work end hour');
        }
        const data = {};
        if (dto.workStartHour !== undefined)
            data.workStartHour = dto.workStartHour;
        if (dto.workEndHour !== undefined)
            data.workEndHour = dto.workEndHour;
        if (dto.slotDurationMinutes !== undefined)
            data.slotDurationMinutes = dto.slotDurationMinutes;
        const updated = await this.prisma.master.update({
            where: { userId },
            data,
            select: {
                workStartHour: true,
                workEndHour: true,
                slotDurationMinutes: true,
            },
        });
        await this.invalidateMasterCache(master.id, master.slug);
        return { success: true, ...updated };
    }
    async getQuickReplies(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const items = await this.prisma.quickReply.findMany({
            where: { masterId: master.id },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, text: true, order: true },
        });
        return { items };
    }
    async replaceQuickReplies(userId, dto) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true, slug: true },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const itemsWithOrder = dto.items.map((it, index) => ({
            text: it.text,
            order: it.order ?? index,
        }));
        await this.prisma.$transaction([
            this.prisma.quickReply.deleteMany({ where: { masterId: master.id } }),
            this.prisma.quickReply.createMany({
                data: itemsWithOrder.map((it) => ({
                    masterId: master.id,
                    text: it.text,
                    order: it.order,
                })),
            }),
        ]);
        const updated = await this.prisma.quickReply.findMany({
            where: { masterId: master.id },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, text: true, order: true },
        });
        await this.invalidateMasterCache(master.id, master.slug);
        return { success: true, items: updated };
    }
    async getAutoresponderSettings(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: {
                autoresponderEnabled: true,
                autoresponderMessage: true,
                workStartHour: true,
                workEndHour: true,
            },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        return master;
    }
    async updateAutoresponderSettings(userId, dto) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true, slug: true },
        });
        if (!master)
            throw new common_1.NotFoundException('Master profile not found');
        const data = {};
        if (dto.enabled !== undefined)
            data.autoresponderEnabled = dto.enabled;
        if (dto.message !== undefined)
            data.autoresponderMessage = dto.message;
        const updated = await this.prisma.master.update({
            where: { userId },
            data,
            select: { autoresponderEnabled: true, autoresponderMessage: true },
        });
        await this.invalidateMasterCache(master.id, master.slug);
        return { success: true, ...updated };
    }
    async getMasterPhotos(masterIdOrSlug, limit = 15) {
        const decodedId = (0, id_encoder_1.decodeId)(masterIdOrSlug);
        const identifier = decodedId || masterIdOrSlug;
        return this.photosService.getMasterPhotos(identifier, limit);
    }
    async getMyPhotos(userId) {
        return this.photosService.getMyPhotos(userId);
    }
    async removeMyPhoto(userId, fileId) {
        const onInvalidate = (masterId, slug) => this.invalidateMasterCache(masterId, slug);
        return this.photosService.removeMyPhoto(userId, fileId, onInvalidate);
    }
    async setMyAvatar(userId, fileId) {
        const onInvalidate = (masterId, slug) => this.invalidateMasterCache(masterId, slug);
        return this.photosService.setMyAvatar(userId, fileId, onInvalidate);
    }
    async getLandingStats() {
        const cacheKey = 'cache:landing:stats';
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const verifiedWhere = {
            OR: [
                { user: { isVerified: true } },
                { verification: { status: constants_1.VerificationStatus.APPROVED } },
            ],
        };
        const [verifiedMastersCount, verifiedOnlineMastersCount, completedProjectsCount, ratingAgg,] = await Promise.all([
            this.prisma.master.count({ where: verifiedWhere }),
            this.prisma.master.count({
                where: {
                    ...verifiedWhere,
                    isOnline: true,
                },
            }),
            this.prisma.lead.count({ where: { status: constants_1.LeadStatus.CLOSED } }),
            this.prisma.master.aggregate({
                _avg: { rating: true },
                where: { rating: { gt: 0 } },
            }),
        ]);
        const averageRating = ratingAgg._avg.rating != null
            ? Math.round(ratingAgg._avg.rating * 10) / 10
            : 4.9;
        const result = {
            verifiedMastersCount,
            verifiedOnlineMastersCount,
            completedProjectsCount,
            averageRating,
            support24_7: true,
        };
        await this.cache.set(cacheKey, result, 600);
        return result;
    }
    async getStats(userId) {
        const master = await this.profileService.getProfile(userId);
        return this.statsService.getStats(master.id);
    }
    async getViewsHistory(userId, period, limit = 12) {
        const master = await this.profileService.getProfile(userId);
        return this.statsService.getViewsHistory(master.id, period, limit);
    }
    async updateOnlineStatus(userId, isOnline) {
        const master = await this.profileService.getProfile(userId);
        const updated = await this.prisma.master.update({
            where: { id: master.id },
            data: {
                isOnline,
                lastActivityAt: new Date(),
            },
            select: {
                id: true,
                isOnline: true,
                lastActivityAt: true,
            },
        });
        await this.invalidateMasterCache(master.id, master.slug);
        return {
            success: true,
            isOnline: updated.isOnline,
            lastActivityAt: updated.lastActivityAt,
        };
    }
    async updateAvailabilityStatus(userId, dto) {
        const master = await this.profileService.getProfile(userId);
        const isPremium = (0, plans_1.getEffectiveTariff)(master) === 'PREMIUM';
        if (!isPremium) {
            throw new common_1.ForbiddenException('Availability status (Available/Busy) and max leads limit are PREMIUM features.');
        }
        const updateData = {
            availabilityStatus: dto.availabilityStatus,
            lastActivityAt: new Date(),
        };
        if (dto.maxActiveLeads !== undefined) {
            updateData.maxActiveLeads = dto.maxActiveLeads;
        }
        const needsNotification = dto.availabilityStatus === 'AVAILABLE' &&
            master.availabilityStatus !== 'AVAILABLE';
        const updated = await this.prisma.master.update({
            where: { id: master.id },
            data: updateData,
            select: {
                id: true,
                availabilityStatus: true,
                maxActiveLeads: true,
                currentActiveLeads: true,
                lastActivityAt: true,
            },
        });
        await this.invalidateMasterCache(master.id, master.slug);
        if (needsNotification) {
            this.eventEmitter.emit('master.available', { masterId: master.id });
        }
        return {
            success: true,
            ...updated,
        };
    }
    async getAvailabilityStatus(userId) {
        const master = await this.profileService.getProfile(userId);
        const data = await this.prisma.master.findUnique({
            where: { id: master.id },
            select: {
                availabilityStatus: true,
                maxActiveLeads: true,
                currentActiveLeads: true,
                isOnline: true,
                lastActivityAt: true,
            },
        });
        if (!data) {
            throw new common_1.NotFoundException('Master availability data not found');
        }
        return {
            success: true,
            ...data,
            canAcceptLeads: data.availabilityStatus === 'AVAILABLE' &&
                data.currentActiveLeads < data.maxActiveLeads,
        };
    }
    async updateLastActivity(userId) {
        try {
            const master = await this.prisma.master.findFirst({
                where: { userId },
                select: { id: true },
            });
            if (master) {
                await this.prisma.master.update({
                    where: { id: master.id },
                    data: { lastActivityAt: new Date() },
                });
            }
        }
        catch {
        }
    }
    async getTariff(userId) {
        return this.tariffService.getTariff(userId);
    }
    async updateTariff(masterId, tariffTypeStr, days) {
        const onInvalidate = (mid, slug) => this.invalidateMasterCache(mid, slug);
        return this.tariffService.updateTariff(masterId, tariffTypeStr, days, onInvalidate);
    }
    async claimFreePlan(userId, tariffType) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { masterProfile: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.role !== 'MASTER')
            throw new common_1.BadRequestException('Only masters can claim a free plan');
        if (!user.isVerified)
            throw new common_1.BadRequestException('Verification required. Complete verification to claim a free plan.');
        if (!user.masterProfile)
            throw new common_1.NotFoundException('Master profile not found');
        const DAYS_FREE = 30;
        const result = await this.updateTariff(user.masterProfile.id, tariffType, DAYS_FREE);
        await Promise.all([
            this.cache.del(this.cache.keys.userProfile(userId)),
            this.cache.del(this.cache.keys.userMasterProfile(userId)),
        ]);
        return result;
    }
    async handleViewIncrement(masterId, userId, sessionId, ipAddress, userAgent, categoryId, cityId) {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        if (userId) {
            const [profileMaster, viewerMaster] = await Promise.all([
                this.prisma.master.findUnique({
                    where: { id: masterId },
                    select: { userId: true },
                }),
                this.prisma.master.findUnique({
                    where: { userId },
                    select: { id: true },
                }),
            ]);
            if (profileMaster?.userId === userId)
                return;
            if (viewerMaster)
                return;
        }
        const viewerIdent = userId
            ? { userId }
            : sessionId
                ? { sessionId }
                : ipAddress
                    ? { ipAddress }
                    : null;
        if (viewerIdent) {
            const alreadyViewedToday = await this.prisma.userActivity.findFirst({
                where: {
                    masterId,
                    action: 'view',
                    createdAt: { gte: todayStart },
                    ...viewerIdent,
                },
            });
            if (alreadyViewedToday)
                return;
        }
        await this.prisma.master.update({
            where: { id: masterId },
            data: { views: { increment: 1 } },
        });
        this.eventEmitter.emit(activity_events_1.ActivityEvent.TRACKED, {
            userId,
            sessionId,
            action: 'view',
            masterId,
            categoryId,
            cityId,
            ipAddress,
            userAgent,
        });
    }
    async invalidateMasterCache(masterId, slug) {
        await this.profileService.invalidateMasterCache(masterId, slug, slug);
    }
};
exports.MastersService = MastersService;
exports.MastersService = MastersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        masters_search_service_1.MastersSearchService,
        masters_profile_service_1.MastersProfileService,
        masters_photos_service_1.MastersPhotosService,
        masters_stats_service_1.MastersStatsService,
        masters_tariff_service_1.MastersTariffService,
        event_emitter_1.EventEmitter2])
], MastersService);
//# sourceMappingURL=masters.service.js.map