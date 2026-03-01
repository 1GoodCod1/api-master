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
exports.RecommendationsTrackerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let RecommendationsTrackerService = class RecommendationsTrackerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async trackActivity(data) {
        return this.prisma.userActivity.create({
            data: {
                userId: data.userId,
                sessionId: data.sessionId,
                action: data.action,
                masterId: data.masterId,
                categoryId: data.categoryId,
                cityId: data.cityId,
                searchQuery: data.searchQuery,
                metadata: data.metadata,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
    }
};
exports.RecommendationsTrackerService = RecommendationsTrackerService;
exports.RecommendationsTrackerService = RecommendationsTrackerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecommendationsTrackerService);
//# sourceMappingURL=recommendations-tracker.service.js.map