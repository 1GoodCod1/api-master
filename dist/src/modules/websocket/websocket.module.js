"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const websocket_gateway_1 = require("./websocket.gateway");
const redis_module_1 = require("../shared/redis/redis.module");
const prisma_module_1 = require("../shared/database/prisma.module");
const websocket_service_1 = require("./websocket.service");
const websocket_connection_service_1 = require("./services/websocket-connection.service");
const websocket_messaging_service_1 = require("./services/websocket-messaging.service");
const websocket_error_handler_service_1 = require("./services/websocket-error-handler.service");
let WebSocketModule = class WebSocketModule {
};
exports.WebSocketModule = WebSocketModule;
exports.WebSocketModule = WebSocketModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('jwt.accessSecret'),
                }),
                inject: [config_1.ConfigService],
            }),
            redis_module_1.RedisModule,
            (0, common_1.forwardRef)(() => prisma_module_1.PrismaModule),
        ],
        providers: [
            websocket_gateway_1.WebsocketGateway,
            websocket_service_1.WebsocketService,
            websocket_connection_service_1.WebsocketConnectionService,
            websocket_messaging_service_1.WebsocketMessagingService,
            websocket_error_handler_service_1.WebsocketErrorHandlerService,
        ],
        exports: [websocket_service_1.WebsocketService, websocket_gateway_1.WebsocketGateway],
    })
], WebSocketModule);
//# sourceMappingURL=websocket.module.js.map