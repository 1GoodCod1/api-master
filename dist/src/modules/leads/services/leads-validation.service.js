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
exports.LeadsValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let LeadsValidationService = class LeadsValidationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resetDailyLeadsCounterIfNeeded(master) {
        const now = new Date();
        const lastResetRaw = master.leadsResetAt;
        const lastReset = lastResetRaw
            ? new Date(lastResetRaw)
            : null;
        if (!lastReset ||
            now.getTime() - lastReset.getTime() >= 24 * 60 * 60 * 1000) {
            await this.prisma.master.update({
                where: { id: master.id },
                data: {
                    leadsReceivedToday: 0,
                    leadsResetAt: now,
                },
            });
            master.leadsReceivedToday = 0;
            master.leadsResetAt = now;
        }
    }
    async validateCreate(masterId, authUser, fileIds) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: { user: true },
        });
        if (!master) {
            throw new common_1.NotFoundException('Master not found');
        }
        if (!master.user?.isVerified) {
            throw new common_1.ForbiddenException('This master has not verified their profile yet. Leads are not accepted until verification.');
        }
        if (authUser?.id && master.userId === authUser.id) {
            throw new common_1.BadRequestException('You cannot send a lead to yourself');
        }
        if (!authUser || authUser.role !== 'CLIENT') {
            throw new common_1.ForbiddenException('Only authorized clients can create leads. Please register or log in.');
        }
        if (authUser?.role === 'CLIENT' && !authUser.phoneVerified) {
            throw new common_1.ForbiddenException('Phone verification required to create leads. Please verify your phone number first.');
        }
        if (master.availabilityStatus === 'BUSY' ||
            master.availabilityStatus === 'OFFLINE') {
            throw new common_1.BadRequestException('Master is currently unavailable and cannot accept new leads. Please try again later or subscribe to notifications.');
        }
        if (master.currentActiveLeads >= master.maxActiveLeads) {
            throw new common_1.BadRequestException(`Master has reached the maximum number of active leads (${master.maxActiveLeads}). Please wait or subscribe to get notified when available.`);
        }
        await this.resetDailyLeadsCounterIfNeeded(master);
        if (master.maxLeadsPerDay !== null &&
            master.leadsReceivedToday >= master.maxLeadsPerDay) {
            throw new common_1.BadRequestException(`Master has reached the daily limit of ${master.maxLeadsPerDay} leads. Please try again tomorrow.`);
        }
        if (fileIds?.length) {
            if (fileIds.length > 10) {
                throw new common_1.BadRequestException('Maximum 10 files allowed');
            }
            const files = await this.prisma.file.findMany({
                where: { id: { in: fileIds } },
            });
            if (files.length !== fileIds.length) {
                throw new common_1.BadRequestException('Some files were not found');
            }
            const allowedUploadedById = authUser?.id ?? null;
            const notOwned = files.find((f) => f.uploadedById !== allowedUploadedById);
            if (notOwned) {
                throw new common_1.BadRequestException('Some files do not belong to you and cannot be attached to the lead');
            }
        }
        return master;
    }
};
exports.LeadsValidationService = LeadsValidationService;
exports.LeadsValidationService = LeadsValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsValidationService);
//# sourceMappingURL=leads-validation.service.js.map