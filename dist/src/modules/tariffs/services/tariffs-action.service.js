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
exports.TariffsActionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const client_runtime_utils_1 = require("@prisma/client-runtime-utils");
let TariffsActionService = class TariffsActionService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async create(dto) {
        const existing = await this.prisma.tariff.findUnique({
            where: { type: dto.type },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Тариф с типом ${dto.type} уже существует`);
        }
        const tariff = await this.prisma.tariff.create({
            data: {
                name: dto.name,
                type: dto.type,
                price: dto.price,
                amount: new client_runtime_utils_1.Decimal(dto.amount),
                days: dto.days ?? 30,
                stripePriceId: dto.stripePriceId,
                description: dto.description,
                features: dto.features,
                isActive: dto.isActive ?? true,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
        await this.invalidateCache(tariff.id, tariff.type);
        return tariff;
    }
    async update(id, dto) {
        const tariff = await this.prisma.tariff.findUnique({ where: { id } });
        if (!tariff)
            throw new common_1.NotFoundException('Тариф не найден');
        if (dto.type && dto.type !== tariff.type) {
            const existing = await this.prisma.tariff.findUnique({
                where: { type: dto.type },
            });
            if (existing)
                throw new common_1.BadRequestException(`Тариф с типом ${dto.type} уже существует`);
        }
        const updated = await this.prisma.tariff.update({
            where: { id },
            data: {
                ...dto,
                amount: dto.amount ? new client_runtime_utils_1.Decimal(dto.amount) : undefined,
            },
        });
        await this.invalidateCache(id, tariff.type, dto.type);
        return updated;
    }
    async remove(id) {
        const tariff = await this.prisma.tariff.findUnique({ where: { id } });
        if (!tariff)
            throw new common_1.NotFoundException('Тариф не найден');
        const deleted = await this.prisma.tariff.delete({ where: { id } });
        await this.invalidateCache(id, tariff.type);
        return deleted;
    }
    async invalidateCache(id, oldType, newType) {
        await this.cache.del(this.cache.keys.tariffById(id));
        await this.cache.del(this.cache.keys.tariffByType(oldType));
        if (newType)
            await this.cache.del(this.cache.keys.tariffByType(newType));
        await this.cache.invalidate('cache:tariffs:all:*');
    }
};
exports.TariffsActionService = TariffsActionService;
exports.TariffsActionService = TariffsActionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], TariffsActionService);
//# sourceMappingURL=tariffs-action.service.js.map