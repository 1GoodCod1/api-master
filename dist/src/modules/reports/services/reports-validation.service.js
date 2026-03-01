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
exports.ReportsValidationService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
let ReportsValidationService = class ReportsValidationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateReportCreation(clientId, dto) {
        const { masterId, leadId } = dto;
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
        });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        const user = await this.prisma.user.findUnique({ where: { id: clientId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        let validLead = null;
        if (leadId) {
            validLead = await this.prisma.lead.findFirst({
                where: {
                    id: leadId,
                    masterId,
                    OR: [{ clientId }, { clientPhone: user.phone }],
                },
            });
        }
        else {
            validLead = await this.prisma.lead.findFirst({
                where: { masterId, OR: [{ clientId }, { clientPhone: user.phone }] },
            });
        }
        if (!validLead) {
            throw new common_1.ForbiddenException('You can only report a master if you have sent a lead to them');
        }
        const existingReport = await this.prisma.report.findFirst({
            where: {
                clientId,
                masterId,
                status: { in: [constants_1.ReportStatus.PENDING, constants_1.ReportStatus.REVIEWED] },
            },
        });
        if (existingReport) {
            throw new common_1.BadRequestException('You have already reported this master. Please wait for review.');
        }
        return { finalLeadId: leadId || validLead.id };
    }
};
exports.ReportsValidationService = ReportsValidationService;
exports.ReportsValidationService = ReportsValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsValidationService);
//# sourceMappingURL=reports-validation.service.js.map