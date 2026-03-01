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
exports.LeadsActionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
const masters_availability_service_1 = require("../../masters/services/masters-availability.service");
const VALID_LEAD_STATUS_TRANSITIONS = {
    NEW: ['IN_PROGRESS', 'CLOSED', 'SPAM'],
    IN_PROGRESS: ['CLOSED', 'SPAM'],
    CLOSED: [],
    SPAM: [],
};
let LeadsActionsService = class LeadsActionsService {
    prisma;
    cache;
    inAppNotifications;
    availabilityService;
    constructor(prisma, cache, inAppNotifications, availabilityService) {
        this.prisma = prisma;
        this.cache = cache;
        this.inAppNotifications = inAppNotifications;
        this.availabilityService = availabilityService;
    }
    async updateStatus(leadId, authUser, updateDto) {
        const masterId = authUser.masterProfile?.id;
        if (!masterId && authUser.role !== 'ADMIN') {
            throw new common_1.BadRequestException('Master profile not found');
        }
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (authUser.role !== 'ADMIN' && lead.masterId !== masterId) {
            throw new common_1.ForbiddenException('You can only update your own leads');
        }
        const oldStatus = lead.status;
        const newStatus = updateDto.status;
        if (authUser.role !== 'ADMIN') {
            const allowedTransitions = VALID_LEAD_STATUS_TRANSITIONS[oldStatus] ?? [];
            if (!allowedTransitions.includes(newStatus)) {
                const finalStates = ['CLOSED', 'SPAM'];
                if (finalStates.includes(oldStatus)) {
                    throw new common_1.BadRequestException(`Lead is already in a final state (${oldStatus}) and cannot be changed.`);
                }
                throw new common_1.BadRequestException(`Invalid status transition from ${oldStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`);
            }
        }
        const updated = await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                status: newStatus,
                updatedAt: new Date(),
            },
        });
        if (oldStatus !== 'CLOSED' && newStatus === 'CLOSED') {
            const updatedMaster = await this.availabilityService.decrementActiveLeads(lead.masterId);
            if (updatedMaster && updatedMaster.availabilityStatus === 'AVAILABLE') {
                void this.notifySubscribersAboutAvailability(lead.masterId);
            }
        }
        await this.cache.invalidate(`cache:master:${lead.masterId}:leads:*`);
        await this.cache.del(this.cache.keys.masterStats(lead.masterId));
        return updated;
    }
    async notifySubscribersAboutAvailability(masterId) {
        try {
            const master = await this.prisma.master.findUnique({
                where: { id: masterId },
                select: {
                    id: true,
                    user: { select: { firstName: true, lastName: true } },
                },
            });
            const masterName = master?.user &&
                [master.user.firstName, master.user.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
            const subscriptions = await this.prisma.masterAvailabilitySubscription.findMany({
                where: {
                    masterId,
                    notifiedAt: null,
                },
            });
            if (subscriptions.length === 0)
                return;
            for (const subscription of subscriptions) {
                await this.inAppNotifications
                    .notifyMasterAvailable(subscription.clientId, {
                    masterId,
                    masterName: masterName || undefined,
                })
                    .catch((err) => {
                    console.error(`Failed to send master-available notification to client ${subscription.clientId}:`, err);
                });
                await this.prisma.masterAvailabilitySubscription.update({
                    where: { id: subscription.id },
                    data: { notifiedAt: new Date() },
                });
            }
        }
        catch (error) {
            console.error('Error notifying subscribers:', error);
        }
    }
};
exports.LeadsActionsService = LeadsActionsService;
exports.LeadsActionsService = LeadsActionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        in_app_notification_service_1.InAppNotificationService,
        masters_availability_service_1.MastersAvailabilityService])
], LeadsActionsService);
//# sourceMappingURL=leads-actions.service.js.map