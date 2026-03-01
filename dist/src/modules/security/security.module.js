"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const security_service_1 = require("./security.service");
const security_controller_1 = require("./security.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const audit_module_1 = require("../audit/audit.module");
const security_suspicious_service_1 = require("./services/security-suspicious.service");
const security_ban_service_1 = require("./services/security-ban.service");
const security_auth_service_1 = require("./services/security-auth.service");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, audit_module_1.AuditModule],
        controllers: [security_controller_1.SecurityController],
        providers: [
            security_service_1.SecurityService,
            security_suspicious_service_1.SecuritySuspiciousService,
            security_ban_service_1.SecurityBanService,
            security_auth_service_1.SecurityAuthService,
        ],
        exports: [security_service_1.SecurityService],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map