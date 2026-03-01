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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const admin_users_service_1 = require("./services/admin-users.service");
const admin_masters_service_1 = require("./services/admin-masters.service");
const admin_leads_service_1 = require("./services/admin-leads.service");
const admin_reviews_service_1 = require("./services/admin-reviews.service");
const admin_payments_service_1 = require("./services/admin-payments.service");
const admin_audit_service_1 = require("./services/admin-audit.service");
const admin_analytics_service_1 = require("./services/admin-analytics.service");
const admin_system_service_1 = require("./services/admin-system.service");
const tasks_activity_service_1 = require("../tasks/services/tasks-activity.service");
const cache_service_1 = require("../shared/cache/cache.service");
let AdminService = AdminService_1 = class AdminService {
    usersService;
    mastersService;
    leadsService;
    reviewsService;
    paymentsService;
    auditService;
    analyticsService;
    systemService;
    activityService;
    cache;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(usersService, mastersService, leadsService, reviewsService, paymentsService, auditService, analyticsService, systemService, activityService, cache) {
        this.usersService = usersService;
        this.mastersService = mastersService;
        this.leadsService = leadsService;
        this.reviewsService = reviewsService;
        this.paymentsService = paymentsService;
        this.auditService = auditService;
        this.analyticsService = analyticsService;
        this.systemService = systemService;
        this.activityService = activityService;
        this.cache = cache;
    }
    async getDashboardData() {
        try {
            const [systemStats, recentUsers, recentMasters, recentLeads, recentPayments, activityLogs,] = await Promise.all([
                this.systemService.getSystemStats(),
                this.usersService.getRecentUsers(),
                this.mastersService.getRecentMasters(),
                this.leadsService.getRecentLeads(),
                this.paymentsService.getRecentPayments(),
                this.auditService.getRecentActivity(),
            ]);
            return {
                timestamp: new Date().toISOString(),
                stats: systemStats,
                recent: {
                    users: recentUsers,
                    masters: recentMasters,
                    leads: recentLeads,
                    payments: recentPayments,
                },
                activity: activityLogs,
            };
        }
        catch (error) {
            this.logger.error('Failed to get dashboard data:', error);
            throw error;
        }
    }
    async getSystemStats() {
        return this.systemService.getSystemStats();
    }
    async getUsers(filters) {
        return this.usersService.getUsers(filters);
    }
    async updateUser(userId, data) {
        return this.usersService.updateUser(userId, data);
    }
    async getMasters(filters) {
        return this.mastersService.getMasters(filters);
    }
    async updateMaster(masterId, data) {
        return this.mastersService.updateMaster(masterId, data);
    }
    async getLeads(filters) {
        return this.leadsService.getLeads(filters);
    }
    async getReviews(filters) {
        return this.reviewsService.getReviews(filters);
    }
    async moderateReview(reviewId, status, reason) {
        return this.reviewsService.moderateReview(reviewId, status, reason);
    }
    async getPayments(filters) {
        return this.paymentsService.getPayments(filters);
    }
    async getAnalytics(timeframe = 'day') {
        return this.analyticsService.getAnalytics(timeframe);
    }
    async createBackup() {
        return this.systemService.createBackup();
    }
    async listBackups() {
        return this.systemService.listBackups();
    }
    async getBackupPath(filename) {
        return this.systemService.getBackupPath(filename);
    }
    async invalidateTariffsCache() {
        const invalidated = await this.cache.invalidate('cache:tariffs:all:*');
        this.logger.log(`Tariffs cache invalidated, keys removed: ${invalidated}`);
        return { invalidated };
    }
    async getInactivityStats() {
        return this.activityService.getInactivityStats();
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_users_service_1.AdminUsersService,
        admin_masters_service_1.AdminMastersService,
        admin_leads_service_1.AdminLeadsService,
        admin_reviews_service_1.AdminReviewsService,
        admin_payments_service_1.AdminPaymentsService,
        admin_audit_service_1.AdminAuditService,
        admin_analytics_service_1.AdminAnalyticsService,
        admin_system_service_1.AdminSystemService,
        tasks_activity_service_1.TasksActivityService,
        cache_service_1.CacheService])
], AdminService);
//# sourceMappingURL=admin.service.js.map