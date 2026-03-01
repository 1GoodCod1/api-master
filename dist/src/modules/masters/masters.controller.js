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
exports.MastersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const masters_service_1 = require("./masters.service");
const update_master_dto_1 = require("./dto/update-master.dto");
const search_masters_dto_1 = require("./dto/search-masters.dto");
const set_avatar_dto_1 = require("./dto/set-avatar.dto");
const update_online_status_dto_1 = require("./dto/update-online-status.dto");
const update_availability_status_dto_1 = require("./dto/update-availability-status.dto");
const update_notification_settings_dto_1 = require("./dto/update-notification-settings.dto");
const update_schedule_settings_dto_1 = require("./dto/update-schedule-settings.dto");
const update_quick_replies_dto_1 = require("./dto/update-quick-replies.dto");
const update_autoresponder_settings_dto_1 = require("./dto/update-autoresponder-settings.dto");
const claim_free_plan_dto_1 = require("./dto/claim-free-plan.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const plans_guard_1 = require("../../common/guards/plans.guard");
const plans_decorator_1 = require("../../common/decorators/plans.decorator");
const optional_jwt_auth_guard_1 = require("../../common/guards/optional-jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
let MastersController = class MastersController {
    mastersService;
    constructor(mastersService) {
        this.mastersService = mastersService;
    }
    async findAll(searchDto) {
        return this.mastersService.findAll(searchDto);
    }
    async getFilters() {
        return this.mastersService.getSearchFilters();
    }
    async getPopularMasters(limit = 10) {
        return this.mastersService.getPopularMasters(limit);
    }
    async getMasterPhotos(slugOrId, limit = 15) {
        return this.mastersService.getMasterPhotos(slugOrId, limit);
    }
    async getNewMasters(limit = 10) {
        return this.mastersService.getNewMasters(limit);
    }
    async getLandingStats() {
        return this.mastersService.getLandingStats();
    }
    async getProfile(user) {
        return this.mastersService.getProfile(user.id);
    }
    async updateProfile(user, updateDto) {
        const allowServices = user.role === 'ADMIN' || user.isVerified;
        return this.mastersService.updateProfile(user.id, updateDto, allowServices);
    }
    async setAvatar(dto, user) {
        return this.mastersService.setMyAvatar(user.id, dto.fileId);
    }
    async getMyPhotos(user) {
        return this.mastersService.getMyPhotos(user.id);
    }
    async removeMyPhoto(fileId, user) {
        return this.mastersService.removeMyPhoto(user.id, fileId);
    }
    async getTariff(user) {
        return this.mastersService.getTariff(user.id);
    }
    async claimFreePlan(user, dto) {
        return this.mastersService.claimFreePlan(user.id, dto.tariffType);
    }
    async getStats(user) {
        return this.mastersService.getStats(user.id);
    }
    async getViewsHistory(user, period = 'week', limit = 12) {
        const safePeriod = period === 'month' ? 'month' : 'week';
        return this.mastersService.getViewsHistory(user.id, safePeriod, Math.min(Math.max(limit || 12, 1), 24));
    }
    async updateOnlineStatus(user, dto) {
        return this.mastersService.updateOnlineStatus(user.id, dto.isOnline);
    }
    async updateAvailabilityStatus(user, dto) {
        return this.mastersService.updateAvailabilityStatus(user.id, dto);
    }
    async getAvailabilityStatus(user) {
        return this.mastersService.getAvailabilityStatus(user.id);
    }
    async getNotificationSettings(user) {
        return await this.mastersService.getNotificationSettings(user.id);
    }
    async updateNotificationSettings(user, dto) {
        return await this.mastersService.updateNotificationSettings(user.id, dto);
    }
    async getScheduleSettings(user) {
        return await this.mastersService.getScheduleSettings(user.id);
    }
    async updateScheduleSettings(user, dto) {
        return await this.mastersService.updateScheduleSettings(user.id, dto);
    }
    async getMyQuickReplies(user) {
        return this.mastersService.getQuickReplies(user.id);
    }
    async replaceMyQuickReplies(user, dto) {
        return this.mastersService.replaceQuickReplies(user.id, dto);
    }
    async getMyAutoresponderSettings(user) {
        return this.mastersService.getAutoresponderSettings(user.id);
    }
    async updateMyAutoresponderSettings(user, dto) {
        return this.mastersService.updateAutoresponderSettings(user.id, dto);
    }
    async findOne(slugOrId, req) {
        return this.mastersService.findOne(slugOrId, req, true);
    }
};
exports.MastersController = MastersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search masters with filters' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_masters_dto_1.SearchMastersDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('filters'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available search filters' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getFilters", null);
__decorate([
    (0, common_1.Get)('popular'),
    (0, swagger_1.ApiOperation)({ summary: 'Get popular masters' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getPopularMasters", null);
__decorate([
    (0, common_1.Get)(':slug/photos'),
    (0, swagger_1.ApiOperation)({ summary: 'Get master photos (public, max 15)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getMasterPhotos", null);
__decorate([
    (0, common_1.Get)('new'),
    (0, swagger_1.ApiOperation)({ summary: 'Get new masters' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getNewMasters", null);
__decorate([
    (0, common_1.Get)('landing-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get landing page stats (public)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getLandingStats", null);
__decorate([
    (0, common_1.Get)('profile/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get master profile (authenticated)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update master profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_master_dto_1.UpdateMasterDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Patch)('avatar/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Set current user master avatar by fileId' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [set_avatar_dto_1.SetMasterAvatarDto, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "setAvatar", null);
__decorate([
    (0, common_1.Get)('photos/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my photos' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getMyPhotos", null);
__decorate([
    (0, common_1.Delete)('photos/:fileId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get by my photo by id' }),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "removeMyPhoto", null);
__decorate([
    (0, common_1.Get)('tariff/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current tariff info' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getTariff", null);
__decorate([
    (0, common_1.Post)('tariff/claim-free'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Claim free plan (verified masters only, 1-click)',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, claim_free_plan_dto_1.ClaimFreePlanDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "claimFreePlan", null);
__decorate([
    (0, common_1.Get)('stats/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get master statistics' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('stats/me/views-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get profile views history (past weeks or months)' }),
    (0, swagger_1.ApiQuery)({ name: 'period', required: true, enum: ['week', 'month'] }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getViewsHistory", null);
__decorate([
    (0, common_1.Patch)('online-status/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update master online status' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_online_status_dto_1.UpdateOnlineStatusDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateOnlineStatus", null);
__decorate([
    (0, common_1.Patch)('availability-status/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update master availability status and max leads' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_availability_status_dto_1.UpdateAvailabilityStatusDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateAvailabilityStatus", null);
__decorate([
    (0, common_1.Get)('availability-status/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get master availability status' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getAvailabilityStatus", null);
__decorate([
    (0, common_1.Get)('notifications-settings/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get notification settings (Telegram, WhatsApp)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getNotificationSettings", null);
__decorate([
    (0, common_1.Patch)('notifications-settings/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, plans_guard_1.PlansGuard),
    (0, plans_decorator_1.Plans)('VIP', 'PREMIUM'),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update notification settings (Telegram, WhatsApp). Premium only.',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_notification_settings_dto_1.UpdateNotificationSettingsDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateNotificationSettings", null);
__decorate([
    (0, common_1.Get)('schedule-settings/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get schedule settings (working hours, slot duration)',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getScheduleSettings", null);
__decorate([
    (0, common_1.Patch)('schedule-settings/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update schedule settings (working hours, slot duration)',
    }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_schedule_settings_dto_1.UpdateScheduleSettingsDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateScheduleSettings", null);
__decorate([
    (0, common_1.Get)('quick-replies/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my quick replies (master)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getMyQuickReplies", null);
__decorate([
    (0, common_1.Put)('quick-replies/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Replace my quick replies list (master)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_quick_replies_dto_1.UpdateQuickRepliesDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "replaceMyQuickReplies", null);
__decorate([
    (0, common_1.Get)('autoresponder/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my autoresponder settings (master)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "getMyAutoresponderSettings", null);
__decorate([
    (0, common_1.Patch)('autoresponder/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update my autoresponder settings (master)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_autoresponder_settings_dto_1.UpdateAutoresponderSettingsDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "updateMyAutoresponderSettings", null);
__decorate([
    (0, common_1.Get)(':slug'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get master by slug or ID' }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "findOne", null);
exports.MastersController = MastersController = __decorate([
    (0, swagger_1.ApiTags)('Masters'),
    (0, common_1.Controller)('masters'),
    __metadata("design:paramtypes", [masters_service_1.MastersService])
], MastersController);
//# sourceMappingURL=masters.controller.js.map