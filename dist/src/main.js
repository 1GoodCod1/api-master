"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const nest_winston_1 = require("nest-winston");
const app_module_1 = require("./app.module");
const winston_config_1 = require("./config/winston.config");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const timeout_interceptor_1 = require("./common/interceptors/timeout.interceptor");
function getCorsOrigins() {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        const origins = (process.env.FRONTEND_URL || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        if (origins.length === 0) {
            console.error('[FATAL] FRONTEND_URL is required in production. Set env FRONTEND_URL=https://your-domain.com');
            process.exit(1);
        }
        return origins.length === 1 ? origins[0] : origins;
    }
    const list = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean);
    return list.length ? list : 'http://localhost:3000';
}
function getCspImgSrc() {
    const base = ["'self'", 'data:', 'blob:'];
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const origins = [apiUrl, ...frontendUrls].filter((u) => u);
    return [...base, ...origins];
}
function validateProductionSecrets(config) {
    if (process.env.NODE_ENV !== 'production')
        return;
    const access = config.get('jwt.accessSecret', '');
    const refresh = config.get('jwt.refreshSecret', '');
    const enc = config.get('idEncryption.secret', '');
    const bad = !access ||
        access.includes('change-me') ||
        !refresh ||
        refresh.includes('change-me') ||
        !enc ||
        enc === 'mm-secret-2024';
    if (bad) {
        console.error('[FATAL] In production set secure values: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ID_ENCRYPTION_SECRET. Do not use defaults.');
        process.exit(1);
    }
}
async function bootstrap() {
    console.log('[1] Starting application...');
    try {
        console.log('[2] Creating NestFactory...');
        const startTime = Date.now();
        const useHttpOnlyCookie = process.env.NODE_ENV !== 'production';
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: false,
            bufferLogs: true,
            rawBody: true,
            cors: {
                origin: getCorsOrigins(),
                credentials: useHttpOnlyCookie,
            },
        });
        if (useHttpOnlyCookie) {
            app.use((0, cookie_parser_1.default)());
        }
        const createTime = Date.now() - startTime;
        console.log(`[3] Application created successfully in ${createTime}ms`);
        const nestLogger = nest_winston_1.WinstonModule.createLogger(winston_config_1.winstonConfig);
        app.useLogger(nestLogger);
        const configService = app.get(config_1.ConfigService);
        validateProductionSecrets(configService);
        const isProd = process.env.NODE_ENV === 'production';
        app.use((0, helmet_1.default)({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'"],
                    imgSrc: getCspImgSrc(),
                    connectSrc: ["'self'", 'wss:', 'ws:'],
                    frameSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'self'"],
                    upgradeInsecureRequests: isProd ? [] : null,
                },
            },
            strictTransportSecurity: isProd
                ? { maxAge: 31536000, includeSubDomains: true, preload: true }
                : false,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        }));
        const compressionMiddleware = compression_1.default;
        app.use(compressionMiddleware());
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
        app.useGlobalInterceptors(new timeout_interceptor_1.TimeoutInterceptor(configService.get('requestTimeoutMs', 30000)));
        const config = new swagger_1.DocumentBuilder()
            .setTitle('MoldMasters API')
            .setDescription('Marketplace for masters in Moldova')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        if (process.env.NODE_ENV !== 'production') {
            const document = swagger_1.SwaggerModule.createDocument(app, config);
            swagger_1.SwaggerModule.setup('docs', app, document);
        }
        const port = configService.get('port', 4000);
        console.log(`[4] Starting server on port ${port}...`);
        await app.listen(port);
        const logger = new common_1.Logger('Bootstrap');
        logger.log(`[5] Приложение запущено на: http://localhost:${port}`);
        if (process.env.NODE_ENV !== 'production') {
            logger.log(`Swagger документация: http://localhost:${port}/docs`);
        }
        const shutdown = async (signal) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;
            const logger = new common_1.Logger('Shutdown');
            logger.log(`Received ${signal}, starting graceful shutdown...`);
            const shutdownTimeout = setTimeout(() => {
                logger.error('Graceful shutdown timeout, forcing exit');
                process.exit(1);
            }, 10000);
            try {
                await Promise.race([
                    app.close(),
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Shutdown timeout')), 8000);
                    }),
                ]);
                clearTimeout(shutdownTimeout);
                logger.log('Application closed gracefully');
                process.exit(0);
            }
            catch (error) {
                clearTimeout(shutdownTimeout);
                const message = error instanceof Error ? error.message : 'Unknown error';
                logger.warn(`Error during shutdown: ${message}`);
                logger.log('Application closed');
                process.exit(0);
            }
        };
        process.on('SIGTERM', () => void shutdown('SIGTERM'));
        process.on('SIGINT', () => void shutdown('SIGINT'));
    }
    catch (error) {
        console.error('[ERROR] Failed to start application:', error);
        process.exit(1);
    }
}
let isShuttingDown = false;
process.on('unhandledRejection', (reason, promise) => {
    if (isShuttingDown && (reason === undefined || reason === null)) {
        return;
    }
    console.error('[UNHANDLED REJECTION] Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    if (process.env.NODE_ENV === 'production' && !isShuttingDown) {
        process.exit(1);
    }
});
process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION] Uncaught Exception:', error);
    process.exit(1);
});
void bootstrap();
//# sourceMappingURL=main.js.map