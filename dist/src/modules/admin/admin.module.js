"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const cache_module_1 = require("../shared/cache/cache.module");
const tasks_module_1 = require("../tasks/tasks.module");
const admin_users_service_1 = require("./services/admin-users.service");
const admin_masters_service_1 = require("./services/admin-masters.service");
const admin_leads_service_1 = require("./services/admin-leads.service");
const admin_reviews_service_1 = require("./services/admin-reviews.service");
const admin_payments_service_1 = require("./services/admin-payments.service");
const admin_audit_service_1 = require("./services/admin-audit.service");
const admin_analytics_service_1 = require("./services/admin-analytics.service");
const admin_system_service_1 = require("./services/admin-system.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, cache_module_1.CacheModule, tasks_module_1.TasksModule],
        controllers: [admin_controller_1.AdminController],
        providers: [
            admin_service_1.AdminService,
            admin_users_service_1.AdminUsersService,
            admin_masters_service_1.AdminMastersService,
            admin_leads_service_1.AdminLeadsService,
            admin_reviews_service_1.AdminReviewsService,
            admin_payments_service_1.AdminPaymentsService,
            admin_audit_service_1.AdminAuditService,
            admin_analytics_service_1.AdminAnalyticsService,
            admin_system_service_1.AdminSystemService,
        ],
        exports: [admin_service_1.AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map