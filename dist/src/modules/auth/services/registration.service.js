"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const token_service_1 = require("./token.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
let RegistrationService = class RegistrationService {
    prisma;
    tokenService;
    cache;
    inAppNotifications;
    constructor(prisma, tokenService, cache, inAppNotifications) {
        this.prisma = prisma;
        this.tokenService = tokenService;
        this.cache = cache;
        this.inAppNotifications = inAppNotifications;
    }
    async register(registerDto) {
        this.validateInput(registerDto);
        await this.ensureUserUnique(registerDto.email, registerDto.phone);
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        let user;
        let master;
        if (registerDto.role === 'MASTER') {
            const { cityId, categoryId } = await this.prepareMasterRequiredData(registerDto.city, registerDto.category);
            const result = await this.prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email: registerDto.email,
                        phone: registerDto.phone,
                        password: hashedPassword,
                        role: 'MASTER',
                        isVerified: false,
                        firstName: registerDto.firstName,
                        lastName: registerDto.lastName,
                    },
                });
                const slug = await this.generateSlug(tx, registerDto.firstName, registerDto.lastName);
                const newMaster = await tx.master.create({
                    data: {
                        userId: newUser.id,
                        slug,
                        cityId,
                        categoryId,
                        description: registerDto.description || null,
                        rating: 0,
                        totalReviews: 0,
                        experienceYears: 0,
                        tariffType: 'BASIC',
                        views: 0,
                        leadsCount: 0,
                    },
                });
                return { user: newUser, master: newMaster };
            });
            user = result.user;
            master = result.master;
            await Promise.all([
                this.cache.invalidate('cache:masters:new:*'),
                this.cache.invalidate('cache:categories:all:*'),
            ]);
        }
        else {
            user = await this.prisma.user.create({
                data: {
                    email: registerDto.email,
                    phone: registerDto.phone,
                    password: hashedPassword,
                    role: 'CLIENT',
                    isVerified: false,
                    firstName: registerDto.firstName?.trim() || null,
                    lastName: registerDto.lastName?.trim() || null,
                },
            });
        }
        try {
            const name = [registerDto.firstName, registerDto.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
            await this.inAppNotifications.notifyNewRegistration({
                userId: user.id,
                role: user.role,
                name: name || undefined,
            });
        }
        catch (err) {
            console.error('Failed to send new registration notification:', err);
        }
        return this.assembleResponse(user, master, registerDto.city, registerDto.category);
    }
    validateInput(dto) {
        const { role = 'CLIENT', city, category, firstName, lastName } = dto;
        if (role !== 'MASTER' && role !== 'CLIENT') {
            throw new common_1.BadRequestException('Only MASTER or CLIENT registration is allowed');
        }
        if (role === 'MASTER' && (!city || !category || !firstName || !lastName)) {
            throw new common_1.BadRequestException('For MASTER registration: city, category, firstName, and lastName are required');
        }
    }
    async ensureUserUnique(email, phone) {
        const existingUser = await this.prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email or phone already exists');
        }
    }
    async prepareMasterRequiredData(citySlugOrName, categorySlugOrName) {
        const [foundCity, foundCategory] = await Promise.all([
            this.findCityBySlugOrName(citySlugOrName),
            this.findCategoryBySlugOrName(categorySlugOrName),
        ]);
        if (!foundCity)
            throw new common_1.BadRequestException(`City "${citySlugOrName}" not found.`);
        if (!foundCategory)
            throw new common_1.BadRequestException(`Category "${categorySlugOrName}" not found.`);
        return { cityId: foundCity.id, categoryId: foundCategory.id };
    }
    async findCityBySlugOrName(slugOrName) {
        const bySlug = await this.prisma.city.findFirst({
            where: {
                isActive: true,
                slug: { equals: slugOrName, mode: 'insensitive' },
            },
        });
        if (bySlug)
            return bySlug;
        return this.prisma.city.findFirst({
            where: {
                isActive: true,
                name: { equals: slugOrName, mode: 'insensitive' },
            },
        });
    }
    async findCategoryBySlugOrName(slugOrName) {
        const bySlug = await this.prisma.category.findFirst({
            where: {
                isActive: true,
                slug: { equals: slugOrName, mode: 'insensitive' },
            },
        });
        if (bySlug)
            return bySlug;
        return this.prisma.category.findFirst({
            where: {
                isActive: true,
                name: { equals: slugOrName, mode: 'insensitive' },
            },
        });
    }
    async generateSlug(tx, firstName, lastName) {
        const { generateUniqueSlugWithDb } = await import('../../shared/utils/slug.js');
        const fullName = `${firstName} ${lastName}`.trim();
        return generateUniqueSlugWithDb(fullName, async (prefix) => {
            const rows = await tx.master.findMany({
                where: { slug: { startsWith: prefix } },
                select: { slug: true },
            });
            return rows.map((m) => m.slug).filter((s) => s != null);
        });
    }
    async assembleResponse(user, master, city, category) {
        const accessToken = this.tokenService.generateAccessToken(user);
        const refreshToken = await this.tokenService.generateRefreshToken(user.id);
        if (user.role === 'MASTER' && master) {
            return {
                message: 'Registration successful. Please wait for admin verification.',
                userId: user.id,
                masterId: master.id,
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isVerified: user.isVerified,
                    masterProfile: {
                        id: master.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        city,
                        category,
                    },
                },
            };
        }
        return {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
            },
            accessToken,
            refreshToken,
        };
    }
    async getRegistrationOptions() {
        const [cities, categories] = await Promise.all([
            this.prisma.city.findMany({
                where: { isActive: true },
                select: { name: true, slug: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.category.findMany({
                where: { isActive: true },
                select: { name: true, slug: true, icon: true },
                orderBy: { sortOrder: 'asc' },
            }),
        ]);
        return {
            cities: cities.map((city) => ({
                name: city.name,
                slug: city.slug,
                value: city.slug,
            })),
            categories: categories.map((cat) => ({
                name: cat.name,
                slug: cat.slug,
                icon: cat.icon,
                value: cat.slug,
            })),
        };
    }
};
exports.RegistrationService = RegistrationService;
exports.RegistrationService = RegistrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        token_service_1.TokenService,
        cache_service_1.CacheService,
        in_app_notification_service_1.InAppNotificationService])
], RegistrationService);
//# sourceMappingURL=registration.service.js.map