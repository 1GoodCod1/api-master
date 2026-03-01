"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationModule = void 0;
const common_1 = require("@nestjs/common");
const verification_service_1 = require("./verification.service");
const verification_controller_1 = require("./verification.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const phone_verification_module_1 = require("../phone-verification/phone-verification.module");
const notifications_module_1 = require("../notifications/notifications.module");
const verification_query_service_1 = require("./services/verification-query.service");
const verification_action_service_1 = require("./services/verification-action.service");
let VerificationModule = class VerificationModule {
};
exports.VerificationModule = VerificationModule;
exports.VerificationModule = VerificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            phone_verification_module_1.PhoneVerificationModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [verification_controller_1.VerificationController],
        providers: [
            verification_service_1.VerificationService,
            verification_query_service_1.VerificationQueryService,
            verification_action_service_1.VerificationActionService,
        ],
        exports: [verification_service_1.VerificationService],
    })
], VerificationModule);
//# sourceMappingURL=verification.module.js.map