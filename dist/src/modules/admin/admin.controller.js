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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const update_user_dto_1 = require("./dto/update-user.dto");
const update_master_dto_1 = require("./dto/update-master.dto");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getDashboard() {
        return this.adminService.getDashboardData();
    }
    async getUsers(role, verified, banned, page = 1, limit = 20, cursor) {
        return this.adminService.getUsers({
            role,
            verified: verified !== undefined && verified !== null
                ? verified === 'true'
                : undefined,
            banned: banned !== undefined && banned !== null ? banned === 'true' : undefined,
            page: Number(page),
            limit: Number(limit),
            cursor,
        });
    }
    async updateUser(id, dto) {
        return this.adminService.updateUser(id, dto);
    }
    async getMasters(verified, featured, tariff, page = 1, limit = 20, cursor) {
        return this.adminService.getMasters({
            verified: verified ? verified === 'true' : undefined,
            featured: featured ? featured === 'true' : undefined,
            tariff,
            page: Number(page),
            limit: Number(limit),
            cursor,
        });
    }
    async updateMaster(id, dto) {
        return this.adminService.updateMaster(id, dto);
    }
    async getLeads(status, dateFrom, dateTo, page = 1, limit = 50, cursor) {
        return this.adminService.getLeads({
            status,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            page: Number(page),
            limit: Number(limit),
            cursor,
        });
    }
    async getReviews(status, page = 1, limit = 50, cursor) {
        return this.adminService.getReviews({
            status,
            page: Number(page),
            limit: Number(limit),
            cursor,
        });
    }
    async moderateReview(id, status, reason) {
        return this.adminService.moderateReview(id, status, reason);
    }
    async getPayments(status, page = 1, limit = 50, cursor) {
        return this.adminService.getPayments({
            status,
            page: Number(page),
            limit: Number(limit),
            cursor,
        });
    }
    async getAnalytics(timeframe = 'day') {
        return this.adminService.getAnalytics(timeframe);
    }
    async createBackup() {
        return this.adminService.createBackup();
    }
    async listBackups() {
        return this.adminService.listBackups();
    }
    async downloadBackup(filename, res) {
        try {
            const { backupDir } = await this.adminService.getBackupPath(filename);
            return res.sendFile(filename, {
                root: backupDir,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message === 'Invalid backup filename' ||
                message === 'Invalid backup path') {
                throw new common_1.BadRequestException(message);
            }
            if (message === 'Backup file not found') {
                throw new common_1.NotFoundException(message);
            }
            throw error;
        }
    }
    async invalidateTariffsCache() {
        return this.adminService.invalidateTariffsCache();
    }
    async getSystemInfo() {
        const stats = await this.adminService.getSystemStats();
        return {
            stats,
            timestamp: new Date().toISOString(),
        };
    }
    async getInactivityStats() {
        return this.adminService.getInactivityStats();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get admin dashboard data' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get users list' }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'verified', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'banned', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('verified')),
    __param(2, (0, common_1.Query)('banned')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.AdminUpdateUserDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Get)('masters'),
    (0, swagger_1.ApiOperation)({ summary: 'Get masters list' }),
    (0, swagger_1.ApiQuery)({ name: 'verified', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'featured', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'tariff', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    __param(0, (0, common_1.Query)('verified')),
    __param(1, (0, common_1.Query)('featured')),
    __param(2, (0, common_1.Query)('tariff')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getMasters", null);
__decorate([
    (0, common_1.Put)('masters/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update master' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_master_dto_1.AdminUpdateMasterDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateMaster", null);
__decorate([
    (0, common_1.Get)('leads'),
    (0, swagger_1.ApiOperation)({ summary: 'Get leads list' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('dateFrom')),
    __param(2, (0, common_1.Query)('dateTo')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Get)('reviews'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reviews list' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReviews", null);
__decorate([
    (0, common_1.Put)('reviews/:id/moderate'),
    (0, swagger_1.ApiOperation)({ summary: 'Moderate review' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "moderateReview", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payments list' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get analytics data' }),
    (0, swagger_1.ApiQuery)({
        name: 'timeframe',
        required: false,
        enum: ['day', 'week', 'month'],
    }),
    __param(0, (0, common_1.Query)('timeframe')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)('backup'),
    (0, swagger_1.ApiOperation)({ summary: 'Create backup' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createBackup", null);
__decorate([
    (0, common_1.Get)('backups'),
    (0, swagger_1.ApiOperation)({ summary: 'List backups' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listBackups", null);
__decorate([
    (0, common_1.Get)('backups/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Download backup file' }),
    (0, common_1.Header)('Content-Type', 'application/json'),
    (0, common_1.Header)('Content-Disposition', 'attachment'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "downloadBackup", null);
__decorate([
    (0, common_1.Post)('cache/tariffs/invalidate'),
    (0, swagger_1.ApiOperation)({ summary: 'Invalidate tariffs cache (e.g. after seed)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "invalidateTariffsCache", null);
__decorate([
    (0, common_1.Get)('system/info'),
    (0, swagger_1.ApiOperation)({ summary: 'Get system information' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemInfo", null);
__decorate([
    (0, common_1.Get)('masters/inactivity-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get masters inactivity statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getInactivityStats", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map