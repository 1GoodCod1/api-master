"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const local_strategy_1 = require("./strategies/local.strategy");
const users_module_1 = require("../users/users.module");
const prisma_module_1 = require("../shared/database/prisma.module");
const audit_module_1 = require("../audit/audit.module");
const cache_module_1 = require("../shared/cache/cache.module");
const email_module_1 = require("../email/email.module");
const notifications_module_1 = require("../notifications/notifications.module");
const token_service_1 = require("./services/token.service");
const registration_service_1 = require("./services/registration.service");
const password_reset_service_1 = require("./services/password-reset.service");
const login_service_1 = require("./services/login.service");
const refresh_cookie_service_1 = require("./services/refresh-cookie.service");
const auth_lockout_service_1 = require("./services/auth-lockout.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('jwt.accessSecret'),
                    signOptions: {
                        expiresIn: configService.get('jwt.accessExpiry'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            cache_module_1.CacheModule,
            email_module_1.EmailModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            local_strategy_1.LocalSStrategy,
            jwt_strategy_1.JwtStrategy,
            token_service_1.TokenService,
            registration_service_1.RegistrationService,
            password_reset_service_1.PasswordResetService,
            login_service_1.LoginService,
            refresh_cookie_service_1.RefreshCookieService,
            auth_lockout_service_1.AuthLockoutService,
        ],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map