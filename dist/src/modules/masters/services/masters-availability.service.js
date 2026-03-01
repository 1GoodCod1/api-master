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
exports.MastersAvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../shared/database/prisma.service");
let MastersAvailabilityService = class MastersAvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async incrementActiveLeads(masterId) {
        const master = await this.prisma.master.update({
            where: { id: masterId },
            data: {
                leadsReceivedToday: { increment: 1 },
                currentActiveLeads: { increment: 1 },
            },
            select: {
                id: true,
                currentActiveLeads: true,
                maxActiveLeads: true,
                availabilityStatus: true,
            },
        });
        if (master.currentActiveLeads >= master.maxActiveLeads &&
            master.availabilityStatus === client_1.AvailabilityStatus.AVAILABLE) {
            await this.prisma.master.update({
                where: { id: masterId },
                data: { availabilityStatus: client_1.AvailabilityStatus.BUSY },
            });
        }
        return master;
    }
    async decrementActiveLeads(masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: {
                id: true,
                currentActiveLeads: true,
                maxActiveLeads: true,
                availabilityStatus: true,
            },
        });
        if (!master || master.currentActiveLeads <= 0)
            return master;
        const updatedMaster = await this.prisma.master.update({
            where: { id: masterId },
            data: {
                currentActiveLeads: { decrement: 1 },
            },
            select: {
                id: true,
                currentActiveLeads: true,
                maxActiveLeads: true,
                availabilityStatus: true,
            },
        });
        if (updatedMaster.availabilityStatus === client_1.AvailabilityStatus.BUSY &&
            updatedMaster.currentActiveLeads < updatedMaster.maxActiveLeads) {
            await this.prisma.master.update({
                where: { id: masterId },
                data: { availabilityStatus: client_1.AvailabilityStatus.AVAILABLE },
            });
            return {
                ...updatedMaster,
                availabilityStatus: client_1.AvailabilityStatus.AVAILABLE,
            };
        }
        return updatedMaster;
    }
    async syncAvailabilityStatus(masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: {
                id: true,
                currentActiveLeads: true,
                maxActiveLeads: true,
                availabilityStatus: true,
            },
        });
        if (!master)
            return;
        let newStatus = master.availabilityStatus;
        if (master.currentActiveLeads >= master.maxActiveLeads) {
            if (master.availabilityStatus === client_1.AvailabilityStatus.AVAILABLE) {
                newStatus = client_1.AvailabilityStatus.BUSY;
            }
        }
        else {
            if (master.availabilityStatus === client_1.AvailabilityStatus.BUSY) {
                newStatus = client_1.AvailabilityStatus.AVAILABLE;
            }
        }
        if (newStatus !== master.availabilityStatus) {
            await this.prisma.master.update({
                where: { id: masterId },
                data: { availabilityStatus: newStatus },
            });
        }
    }
};
exports.MastersAvailabilityService = MastersAvailabilityService;
exports.MastersAvailabilityService = MastersAvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MastersAvailabilityService);
//# sourceMappingURL=masters-availability.service.js.map