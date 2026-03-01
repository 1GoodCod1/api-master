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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const activity_events_1 = require("../recommendations/events/activity.events");
let FavoritesService = class FavoritesService {
    prisma;
    eventEmitter;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async findAll(userId) {
        const favorites = await this.prisma.favorite.findMany({
            where: { userId },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                        avatarFile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return favorites.map((fav) => ({
            id: fav.id,
            masterId: fav.masterId,
            createdAt: fav.createdAt,
            master: fav.master,
        }));
    }
    async create(userId, masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
        });
        if (!master) {
            throw new common_1.NotFoundException('Мастер не найден');
        }
        const existing = await this.prisma.favorite.findUnique({
            where: {
                userId_masterId: {
                    userId,
                    masterId,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Мастер уже в избранном');
        }
        const favorite = await this.prisma.favorite.create({
            data: {
                userId,
                masterId,
            },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                        avatarFile: true,
                    },
                },
            },
        });
        this.eventEmitter.emit(activity_events_1.ActivityEvent.TRACKED, {
            userId,
            action: 'favorite',
            masterId,
            categoryId: favorite.master.categoryId,
            cityId: favorite.master.cityId,
        });
        return {
            id: favorite.id,
            masterId: favorite.masterId,
            createdAt: favorite.createdAt,
            master: favorite.master,
        };
    }
    async remove(userId, masterId) {
        const favorite = await this.prisma.favorite.findUnique({
            where: {
                userId_masterId: {
                    userId,
                    masterId,
                },
            },
        });
        if (!favorite) {
            throw new common_1.NotFoundException('Запись в избранном не найдена');
        }
        await this.prisma.favorite.delete({
            where: {
                userId_masterId: {
                    userId,
                    masterId,
                },
            },
        });
        return { success: true };
    }
    async check(userId, masterId) {
        const favorite = await this.prisma.favorite.findUnique({
            where: {
                userId_masterId: {
                    userId,
                    masterId,
                },
            },
        });
        return !!favorite;
    }
    async count(userId) {
        return this.prisma.favorite.count({
            where: { userId },
        });
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map