"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const leads_service_1 = require("./leads.service");
const leads_controller_1 = require("./leads.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const notifications_module_1 = require("../notifications/notifications.module");
const recaptcha_service_1 = require("../shared/utils/recaptcha.service");
const leads_validation_service_1 = require("./services/leads-validation.service");
const leads_spam_service_1 = require("./services/leads-spam.service");
const leads_analytics_service_1 = require("./services/leads-analytics.service");
const leads_query_service_1 = require("./services/leads-query.service");
const leads_actions_service_1 = require("./services/leads-actions.service");
const master_available_listener_1 = require("./listeners/master-available.listener");
const masters_module_1 = require("../masters/masters.module");
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, notifications_module_1.NotificationsModule, masters_module_1.MastersModule],
        controllers: [leads_controller_1.LeadsController],
        providers: [
            leads_service_1.LeadsService,
            recaptcha_service_1.RecaptchaService,
            leads_validation_service_1.LeadsValidationService,
            leads_spam_service_1.LeadsSpamService,
            leads_analytics_service_1.LeadsAnalyticsService,
            leads_query_service_1.LeadsQueryService,
            leads_actions_service_1.LeadsActionsService,
            master_available_listener_1.MasterAvailableListener,
        ],
        exports: [leads_service_1.LeadsService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map