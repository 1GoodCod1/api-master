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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const in_app_notification_service_1 = require("../notifications/services/in-app-notification.service");
const reports_validation_service_1 = require("./services/reports-validation.service");
const reports_action_service_1 = require("./services/reports-action.service");
const reports_query_service_1 = require("./services/reports-query.service");
let ReportsService = class ReportsService {
    prisma;
    validationService;
    actionService;
    queryService;
    inAppNotifications;
    constructor(prisma, validationService, actionService, queryService, inAppNotifications) {
        this.prisma = prisma;
        this.validationService = validationService;
        this.actionService = actionService;
        this.queryService = queryService;
        this.inAppNotifications = inAppNotifications;
    }
    async create(clientId, dto) {
        const { finalLeadId } = await this.validationService.validateReportCreation(clientId, dto);
        const report = await this.prisma.report.create({
            data: {
                clientId,
                masterId: dto.masterId,
                leadId: finalLeadId,
                reason: dto.reason,
                description: dto.description,
                evidence: dto.evidence ? JSON.stringify(dto.evidence) : null,
                status: constants_1.ReportStatus.PENDING,
            },
            include: {
                client: { select: { id: true, email: true, phone: true } },
                master: {
                    include: { user: { select: { id: true, email: true, phone: true } } },
                },
                lead: true,
            },
        });
        try {
            await this.inAppNotifications.notifyNewReport({
                reportId: report.id,
                reason: report.reason,
                clientId: report.clientId,
                masterId: report.masterId,
            });
        }
        catch (err) {
            console.error('Failed to send new report notification:', err);
        }
        return report;
    }
    async findAll(status) {
        return this.queryService.findAll(status);
    }
    async findByClient(clientId) {
        return this.queryService.findByClient(clientId);
    }
    async updateStatus(reportId, adminId, dto) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
        });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        if (dto.action) {
            await this.actionService.executeAction(report, dto.action, dto.notes);
        }
        return this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: dto.status,
                action: dto.action || null,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                notes: dto.notes || null,
            },
            include: {
                client: { select: { id: true, email: true, phone: true } },
                master: {
                    include: { user: { select: { id: true, email: true, phone: true } } },
                },
                lead: true,
            },
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        reports_validation_service_1.ReportsValidationService,
        reports_action_service_1.ReportsActionService,
        reports_query_service_1.ReportsQueryService,
        in_app_notification_service_1.InAppNotificationService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map