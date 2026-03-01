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
exports.ReportsActionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const update_report_status_dto_1 = require("../dto/update-report-status.dto");
let ReportsActionService = class ReportsActionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async executeAction(report, action, _notes) {
        const master = await this.prisma.master.findUnique({
            where: { id: report.masterId },
            include: { user: true },
        });
        switch (action) {
            case update_report_status_dto_1.ReportAction.BAN_CLIENT:
                await this.prisma.user.update({
                    where: { id: report.clientId },
                    data: { isBanned: true },
                });
                break;
            case update_report_status_dto_1.ReportAction.BAN_MASTER:
                if (master) {
                    await this.prisma.user.update({
                        where: { id: master.userId },
                        data: { isBanned: true },
                    });
                }
                break;
            case update_report_status_dto_1.ReportAction.BAN_IP:
                break;
            case update_report_status_dto_1.ReportAction.WARNING_CLIENT:
            case update_report_status_dto_1.ReportAction.WARNING_MASTER:
                break;
        }
    }
};
exports.ReportsActionService = ReportsActionService;
exports.ReportsActionService = ReportsActionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsActionService);
//# sourceMappingURL=reports-action.service.js.map