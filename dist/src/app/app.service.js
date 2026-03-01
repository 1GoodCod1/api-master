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
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../modules/shared/database/prisma.service");
const redis_service_1 = require("../modules/shared/redis/redis.service");
let AppService = AppService_1 = class AppService {
    configService;
    prisma;
    redis;
    logger = new common_1.Logger(AppService_1.name);
    startTime = Date.now();
    constructor(configService, prisma, redis) {
        this.configService = configService;
        this.prisma = prisma;
        this.redis = redis;
    }
    async getStatus() {
        const services = await this.checkServices();
        const allUp = services.every((s) => s.status === 'up');
        const hasDegraded = services.some((s) => s.status === 'degraded');
        let code;
        let success;
        let message;
        if (allUp) {
            code = 200;
            success = true;
            message = 'All systems operational';
        }
        else if (hasDegraded) {
            code = 206;
            success = true;
            message = 'Systems partially operational';
        }
        else {
            code = 503;
            success = false;
            message = 'Service unavailable';
        }
        return {
            success,
            code,
            message,
            timestamp: new Date().toISOString(),
            version: this.configService.get('npm_package_version') || '1.0.0',
            environment: this.configService.get('NODE_ENV') || 'development',
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            services,
        };
    }
    async getHealth() {
        const services = await this.checkServices();
        const allUp = services.every((s) => s.status === 'up');
        return {
            status: allUp ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
        };
    }
    getVersion() {
        return {
            name: 'MoldMasters API',
            version: this.configService.get('npm_package_version') || '1.0.0',
            build: process.env.BUILD_ID || 'local',
        };
    }
    async checkServices() {
        const checks = [
            this.checkApi(),
            this.checkDatabase(),
            this.checkRedis(),
            this.checkCache(),
        ];
        const results = await Promise.allSettled(checks);
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                const serviceNames = ['API', 'Database', 'Redis', 'Cache'];
                const message = result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason ?? 'Check failed');
                return {
                    name: serviceNames[index] || 'Unknown',
                    status: 'down',
                    message,
                };
            }
        });
    }
    checkApi() {
        const start = Date.now();
        try {
            return Promise.resolve({
                name: 'API',
                status: 'up',
                responseTime: Date.now() - start,
                message: 'API server is responding',
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Check failed';
            return Promise.resolve({ name: 'API', status: 'down', message });
        }
    }
    async checkDatabase() {
        const start = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const tableCount = await this.prisma.$queryRaw `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
            return {
                name: 'Database',
                status: 'up',
                responseTime: Date.now() - start,
                message: `PostgreSQL connected (${tableCount[0]?.count || 0} tables)`,
            };
        }
        catch (error) {
            this.logger.error('Database health check failed:', error);
            const message = error instanceof Error ? error.message : 'Check failed';
            return { name: 'Database', status: 'down', message };
        }
    }
    async checkRedis() {
        const start = Date.now();
        try {
            const redis = this.redis.getClient();
            const pong = await redis.ping();
            if (pong === 'PONG') {
                const info = await redis.info();
                const connectedClients = info.match(/connected_clients:(\d+)/)?.[1] || '0';
                return {
                    name: 'Redis',
                    status: 'up',
                    responseTime: Date.now() - start,
                    message: `Redis connected (${connectedClients} clients)`,
                };
            }
            else {
                return {
                    name: 'Redis',
                    status: 'degraded',
                    message: 'Redis responded with unexpected message',
                };
            }
        }
        catch (error) {
            this.logger.error('Redis health check failed:', error);
            const message = error instanceof Error ? error.message : 'Check failed';
            return { name: 'Redis', status: 'down', message };
        }
    }
    async checkCache() {
        const start = Date.now();
        const testKey = 'health_check_' + Date.now();
        const testValue = 'test_value';
        try {
            const redis = this.redis.getClient();
            await redis.setex(testKey, 10, testValue);
            const retrievedValue = await redis.get(testKey);
            await redis.del(testKey);
            if (retrievedValue === testValue) {
                return {
                    name: 'Cache',
                    status: 'up',
                    responseTime: Date.now() - start,
                    message: 'Cache read/write operations successful',
                };
            }
            else {
                return {
                    name: 'Cache',
                    status: 'degraded',
                    message: 'Cache returned unexpected value',
                };
            }
        }
        catch (error) {
            this.logger.error('Cache health check failed:', error);
            const message = error instanceof Error ? error.message : 'Check failed';
            return { name: 'Cache', status: 'down', message };
        }
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AppService);
//# sourceMappingURL=app.service.js.map