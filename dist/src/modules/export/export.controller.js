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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const export_service_1 = require("./export.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ExportController = class ExportController {
    exportService;
    constructor(exportService) {
        this.exportService = exportService;
    }
    async exportLeadsCSV(masterId, req, res) {
        await this.exportService.exportLeadsToCSV(masterId, req.user, res);
    }
    async exportLeadsExcel(masterId, req, res) {
        await this.exportService.exportLeadsToExcel(masterId, req.user, res);
    }
    async exportAnalyticsPDF(masterId, req, res) {
        await this.exportService.exportAnalyticsToPDF(masterId, req.user, res);
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)('leads/csv/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Export leads to CSV (PREMIUM only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'CSV file' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'PREMIUM tariff required' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportLeadsCSV", null);
__decorate([
    (0, common_1.Get)('leads/excel/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Export leads to Excel (PREMIUM only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Excel file' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'PREMIUM tariff required' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportLeadsExcel", null);
__decorate([
    (0, common_1.Get)('analytics/pdf/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Export analytics to PDF (PREMIUM only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF file' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'PREMIUM tariff required' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportAnalyticsPDF", null);
exports.ExportController = ExportController = __decorate([
    (0, swagger_1.ApiTags)('Export'),
    (0, common_1.Controller)('export'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [export_service_1.ExportService])
], ExportController);
//# sourceMappingURL=export.controller.js.map