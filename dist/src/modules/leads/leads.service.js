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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const in_app_notification_service_1 = require("../notifications/services/in-app-notification.service");
const leads_validation_service_1 = require("./services/leads-validation.service");
const leads_spam_service_1 = require("./services/leads-spam.service");
const leads_analytics_service_1 = require("./services/leads-analytics.service");
const leads_query_service_1 = require("./services/leads-query.service");
const leads_actions_service_1 = require("./services/leads-actions.service");
const masters_availability_service_1 = require("../masters/services/masters-availability.service");
let LeadsService = class LeadsService {
    prisma;
    notificationsService;
    inAppNotifications;
    validationService;
    spamService;
    analyticsService;
    queryService;
    actionsService;
    availabilityService;
    constructor(prisma, notificationsService, inAppNotifications, validationService, spamService, analyticsService, queryService, actionsService, availabilityService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.inAppNotifications = inAppNotifications;
        this.validationService = validationService;
        this.spamService = spamService;
        this.analyticsService = analyticsService;
        this.queryService = queryService;
        this.actionsService = actionsService;
        this.availabilityService = availabilityService;
    }
    async create(createLeadDto, authUser, ipAddress) {
        const { masterId, clientPhone, clientName, message, fileIds, premiumPaymentSessionId, } = createLeadDto;
        const clientId = authUser?.id && authUser?.role === 'CLIENT' ? authUser.id : null;
        let resolvedClientName = clientName?.trim() || null;
        let resolvedClientPhone = clientPhone?.trim() || null;
        if (clientId) {
            const user = await this.prisma.user.findUnique({
                where: { id: clientId },
                select: { firstName: true, lastName: true, phone: true },
            });
            if (user) {
                if (!resolvedClientName) {
                    const full = [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    if (full)
                        resolvedClientName = full;
                }
                if (!resolvedClientPhone && user.phone) {
                    resolvedClientPhone = user.phone;
                }
            }
        }
        if (!resolvedClientPhone) {
            throw new common_1.BadRequestException('Client phone number is missing. Please add it in your profile.');
        }
        createLeadDto.clientPhone = resolvedClientPhone;
        createLeadDto.clientName = resolvedClientName ?? undefined;
        const master = await this.validationService.validateCreate(masterId, authUser, fileIds);
        const isPremium = await this.checkPremiumPayment(premiumPaymentSessionId);
        if (!isPremium) {
            await this.spamService.checkProtection(createLeadDto, ipAddress);
        }
        const spamScore = isPremium
            ? 0
            : this.spamService.calculateSpamScore(createLeadDto);
        if (clientId) {
            const existingOpenLead = await this.prisma.lead.findFirst({
                where: {
                    clientId,
                    masterId,
                    status: { in: ['NEW', 'IN_PROGRESS'] },
                },
                select: { id: true, status: true, createdAt: true },
            });
            if (existingOpenLead) {
                throw new common_1.BadRequestException('У вас уже есть активная заявка к этому мастеру. Дождитесь её завершения перед отправкой новой.');
            }
        }
        const lead = await this.prisma.lead.create({
            data: {
                masterId,
                clientPhone: resolvedClientPhone,
                clientName: resolvedClientName,
                clientId,
                message,
                spamScore,
                isPremium,
                files: fileIds?.length
                    ? {
                        createMany: {
                            data: fileIds.map((id) => ({ fileId: id })),
                            skipDuplicates: true,
                        },
                    }
                    : undefined,
            },
            include: {
                files: { include: { file: true } },
            },
        });
        await this.availabilityService.incrementActiveLeads(masterId);
        await this.analyticsService.handlePostCreation(masterId);
        try {
            await this.prisma.conversation.create({
                data: {
                    leadId: lead.id,
                    masterId: lead.masterId,
                    clientId: lead.clientId,
                    clientPhone: lead.clientPhone,
                },
            });
        }
        catch (error) {
            console.error('Failed to auto-create conversation for lead:', lead.id, error);
        }
        const tg = master.telegramChatId;
        const wa = master.whatsappPhone;
        const notificationOptions = {
            ...(tg ? { telegramChatId: tg } : {}),
            ...(wa ? { whatsappPhone: wa } : {}),
        };
        await this.notificationsService.sendLeadNotification(master.user.phone, {
            leadId: lead.id,
            clientName: resolvedClientName || undefined,
            clientPhone: resolvedClientPhone,
            message,
            isPremium,
        }, notificationOptions);
        if (clientId) {
            try {
                const masterName = [master.user.firstName, master.user.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || 'мастеру';
                await this.inAppNotifications
                    .notifyLeadSentToClient(clientId, { leadId: lead.id, masterName })
                    .catch(() => { });
            }
            catch (err) {
                console.error('Failed to send lead-sent notification to client:', err);
            }
        }
        try {
            await this.inAppNotifications.notifyNewLead(master.userId, {
                leadId: lead.id,
                clientName: resolvedClientName || undefined,
                clientPhone: resolvedClientPhone,
                masterId,
            });
        }
        catch (err) {
            console.error('Failed to save in-app notification for lead:', err);
        }
        return lead;
    }
    async checkPremiumPayment(sessionId) {
        if (!sessionId)
            return false;
        const payment = await this.prisma.payment.findFirst({
            where: {
                stripeSession: sessionId,
                status: constants_1.PaymentStatus.SUCCESS,
                metadata: {
                    path: ['paymentType'],
                    equals: 'PREMIUM_LEAD',
                },
            },
        });
        if (!payment) {
            throw new common_1.BadRequestException('Premium payment not found or not completed');
        }
        return true;
    }
    async findAll(authUser, options = {}) {
        return this.queryService.findAll(authUser, options);
    }
    async findOne(idOrEncoded, authUser) {
        return this.queryService.findOne(idOrEncoded, authUser);
    }
    async updateStatus(leadId, authUser, updateDto) {
        const updated = await this.actionsService.updateStatus(leadId, authUser, updateDto);
        try {
            const master = await this.prisma.master.findUnique({
                where: { id: updated.masterId },
                select: { userId: true },
            });
            if (master) {
                await this.inAppNotifications.notifyLeadStatusUpdated(master.userId, {
                    leadId: updated.id,
                    status: updated.status,
                });
            }
        }
        catch (err) {
            console.error('Failed to send lead status notification:', err);
        }
        return updated;
    }
    async getStats(authUser) {
        return this.queryService.getStats(authUser);
    }
    async subscribeToAvailability(clientId, masterId) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: { id: true, availabilityStatus: true },
        });
        if (!master) {
            throw new common_1.BadRequestException('Master not found');
        }
        const subscription = await this.prisma.masterAvailabilitySubscription.upsert({
            where: {
                clientId_masterId: {
                    clientId,
                    masterId,
                },
            },
            create: {
                clientId,
                masterId,
            },
            update: {
                notifiedAt: null,
            },
        });
        return {
            success: true,
            message: 'You will be notified when this master becomes available',
            subscription,
        };
    }
    async unsubscribeFromAvailability(clientId, masterId) {
        await this.prisma.masterAvailabilitySubscription.deleteMany({
            where: {
                clientId,
                masterId,
            },
        });
        return {
            success: true,
            message: 'Unsubscribed from notifications',
        };
    }
    async getActiveLeadToMaster(clientId, masterId) {
        const activeLead = await this.prisma.lead.findFirst({
            where: {
                clientId,
                masterId,
                status: { in: ['NEW', 'IN_PROGRESS'] },
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                message: true,
                conversation: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return activeLead;
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        in_app_notification_service_1.InAppNotificationService,
        leads_validation_service_1.LeadsValidationService,
        leads_spam_service_1.LeadsSpamService,
        leads_analytics_service_1.LeadsAnalyticsService,
        leads_query_service_1.LeadsQueryService,
        leads_actions_service_1.LeadsActionsService,
        masters_availability_service_1.MastersAvailabilityService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map