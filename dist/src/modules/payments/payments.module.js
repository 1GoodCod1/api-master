"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const payments_service_1 = require("./payments.service");
const payments_controller_1 = require("./payments.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const masters_module_1 = require("../masters/masters.module");
const tariffs_module_1 = require("../tariffs/tariffs.module");
const payments_mia_service_1 = require("./services/payments-mia.service");
const payments_webhook_service_1 = require("./services/payments-webhook.service");
const payments_query_service_1 = require("./services/payments-query.service");
const payments_upgrade_service_1 = require("./services/payments-upgrade.service");
const notifications_module_1 = require("../notifications/notifications.module");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            masters_module_1.MastersModule,
            tariffs_module_1.TariffsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [payments_controller_1.PaymentsController],
        providers: [
            payments_service_1.PaymentsService,
            payments_mia_service_1.PaymentsMiaService,
            payments_webhook_service_1.PaymentsWebhookService,
            payments_query_service_1.PaymentsQueryService,
            payments_upgrade_service_1.PaymentsUpgradeService,
        ],
        exports: [payments_service_1.PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map