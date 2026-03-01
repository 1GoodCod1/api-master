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
exports.MastersProfileService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const plans_1 = require("../../../common/helpers/plans");
let MastersProfileService = class MastersProfileService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findOne(idOrSlug, incrementViews = false, userId, sessionId, ipAddress, userAgent, categoryId, cityId, onViewIncrement) {
        const cacheKey = this.cache.keys.masterFull(idOrSlug);
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult) {
            if (incrementViews && onViewIncrement) {
                onViewIncrement(cachedResult.id, userId, sessionId, ipAddress, userAgent, cachedResult.categoryId ?? undefined, cachedResult.cityId ?? undefined).catch((err) => console.error('Failed to increment views', err));
            }
            return cachedResult;
        }
        let master = await this.prisma.master.findUnique({
            where: { slug: idOrSlug },
            include: {
                avatarFile: true,
                photos: {
                    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                    take: 15,
                    include: {
                        file: {
                            select: {
                                id: true,
                                path: true,
                                mimetype: true,
                                size: true,
                                filename: true,
                                createdAt: true,
                            },
                        },
                    },
                },
                category: true,
                city: true,
                reviews: {
                    where: { status: constants_1.ReviewStatus.VISIBLE },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: {
                        reviews: {
                            where: { status: constants_1.ReviewStatus.VISIBLE },
                        },
                        leads: true,
                    },
                },
            },
        });
        if (!master) {
            master = await this.prisma.master.findUnique({
                where: { id: idOrSlug },
                include: {
                    avatarFile: true,
                    photos: {
                        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                        take: 15,
                        include: {
                            file: {
                                select: {
                                    id: true,
                                    path: true,
                                    mimetype: true,
                                    size: true,
                                    filename: true,
                                    createdAt: true,
                                },
                            },
                        },
                    },
                    category: true,
                    city: true,
                    reviews: {
                        where: { status: constants_1.ReviewStatus.VISIBLE },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            isVerified: true,
                        },
                    },
                    _count: {
                        select: {
                            reviews: {
                                where: { status: constants_1.ReviewStatus.VISIBLE },
                            },
                            leads: true,
                        },
                    },
                },
            });
        }
        if (!master) {
            throw new common_1.NotFoundException('Master not found');
        }
        const sanitized = (0, plans_1.sanitizePublicMaster)(master);
        const photos = (master.photos ?? []);
        const avatarFile = master.avatarFile;
        const result = {
            ...sanitized,
            avatarUrl: avatarFile?.path ?? null,
            photos: photos.map((p) => p.file),
        };
        await this.cache.set(cacheKey, result, this.cache.ttl.masterProfile);
        if (master.slug && master.slug !== idOrSlug) {
            await this.cache.set(this.cache.keys.masterFull(master.id), result, this.cache.ttl.masterProfile);
        }
        if (master.slug && idOrSlug !== master.slug) {
            await this.cache.set(this.cache.keys.masterFull(master.slug), result, this.cache.ttl.masterProfile);
        }
        if (incrementViews && onViewIncrement) {
            onViewIncrement(master.id, userId, sessionId, ipAddress, userAgent, master.categoryId, master.cityId).catch((err) => console.error('Failed to increment views', err));
        }
        return result;
    }
    async getProfile(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            include: {
                user: { select: { firstName: true, lastName: true } },
                category: true,
                city: true,
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                analytics: {
                    orderBy: { date: 'desc' },
                    take: 7,
                },
            },
        });
        if (!master) {
            throw new common_1.NotFoundException('Master profile not found');
        }
        return master;
    }
    PROFILE_EDIT_COOLDOWN_DAYS = 15;
    async updateProfile(userId, updateDto) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        if (master.profileLastEditedAt) {
            const daysSince = Math.floor((Date.now() - master.profileLastEditedAt.getTime()) /
                (1000 * 60 * 60 * 24));
            if (daysSince < this.PROFILE_EDIT_COOLDOWN_DAYS) {
                const daysLeft = this.PROFILE_EDIT_COOLDOWN_DAYS - daysSince;
                throw new common_1.ForbiddenException(`Profile can be edited once every ${this.PROFILE_EDIT_COOLDOWN_DAYS} days. Try again in ${daysLeft} days.`);
            }
        }
        const oldSlug = master.slug;
        const { firstName, lastName, ...masterFields } = updateDto;
        const data = {
            ...masterFields,
            profileLastEditedAt: new Date(),
        };
        if (firstName || lastName) {
            const userUpdateData = {};
            if (firstName)
                userUpdateData.firstName = firstName;
            if (lastName)
                userUpdateData.lastName = lastName;
            await this.prisma.user.update({
                where: { id: userId },
                data: userUpdateData,
            });
            const { generateUniqueSlugWithDb } = await import('../../shared/utils/slug.js');
            const newFirstName = firstName ?? master.user.firstName ?? '';
            const newLastName = lastName ?? master.user.lastName ?? '';
            const fullName = `${newFirstName} ${newLastName}`.trim();
            data.slug = await generateUniqueSlugWithDb(fullName, async (prefix) => {
                const rows = await this.prisma.master.findMany({
                    where: { slug: { startsWith: prefix }, id: { not: master.id } },
                    select: { slug: true },
                });
                return rows.map((m) => m.slug).filter((s) => s != null);
            });
        }
        const updated = await this.prisma.master.update({
            where: { userId },
            data,
        });
        await this.invalidateMasterCache(master.id, oldSlug, updated.slug);
        return updated;
    }
    async invalidateMasterCache(masterId, oldSlug, newSlug) {
        await this.cache.del(this.cache.keys.masterFull(masterId));
        if (oldSlug)
            await this.cache.del(this.cache.keys.masterFull(oldSlug));
        if (newSlug && newSlug !== oldSlug)
            await this.cache.del(this.cache.keys.masterFull(newSlug));
        await this.cache.del(this.cache.keys.masterStats(masterId));
        await this.cache.invalidate(`cache:master:${masterId}:*`);
        await this.cache.invalidate('cache:search:masters:*');
        await this.cache.invalidate('cache:masters:top:*');
        await this.cache.invalidate('cache:masters:popular:*');
        await this.cache.invalidate('cache:masters:new:*');
        await this.cache.del(this.cache.keys.searchFilters());
    }
};
exports.MastersProfileService = MastersProfileService;
exports.MastersProfileService = MastersProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], MastersProfileService);
//# sourceMappingURL=masters-profile.service.js.map