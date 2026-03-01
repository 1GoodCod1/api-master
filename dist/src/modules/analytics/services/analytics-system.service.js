"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsSystemService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const redis_service_1 = require("../../shared/redis/redis.service");
const os = __importStar(require("os"));
let AnalyticsSystemService = class AnalyticsSystemService {
    prisma;
    redis;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getSystemAnalytics() {
        const redisClient = this.redis.getClient();
        const [totalUsers, activeUsers, redisKeys, queueStats, systemMetrics] = await Promise.all([
            this.prisma.user.count(),
            this.getActiveUsersCount(),
            redisClient.dbsize(),
            this.getQueueStats(redisClient),
            Promise.resolve(this.getSystemMetrics()),
        ]);
        return {
            timestamp: new Date().toISOString(),
            users: {
                total: totalUsers,
                active: activeUsers,
            },
            redis: {
                keys: redisKeys,
                memory: await redisClient.info('memory'),
            },
            queues: queueStats,
            system: systemMetrics,
        };
    }
    async getActiveUsersCount() {
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        return this.prisma.user.count({
            where: { lastLoginAt: { gte: lastHour } },
        });
    }
    async getQueueStats(redisClient) {
        const queues = ['sms', 'telegram', 'email'];
        const stats = {};
        for (const queue of queues) {
            const [waiting, active, completed, failed] = await Promise.all([
                redisClient.llen(`bull:${queue}:wait`),
                redisClient.llen(`bull:${queue}:active`),
                redisClient.zcard(`bull:${queue}:completed`),
                redisClient.zcard(`bull:${queue}:failed`),
            ]);
            stats[queue] = { waiting, active, completed, failed };
        }
        return stats;
    }
    getSystemMetrics() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return {
            cpu: {
                loadavg: os.loadavg(),
                cores: os.cpus().length,
            },
            memory: {
                total: this.bytesToMB(totalMem),
                used: this.bytesToMB(usedMem),
                free: this.bytesToMB(freeMem),
                usage: ((usedMem / totalMem) * 100).toFixed(2),
            },
            uptime: os.uptime(),
            platform: os.platform(),
        };
    }
    bytesToMB(bytes) {
        return Math.round(bytes / 1024 / 1024);
    }
};
exports.AnalyticsSystemService = AnalyticsSystemService;
exports.AnalyticsSystemService = AnalyticsSystemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AnalyticsSystemService);
//# sourceMappingURL=analytics-system.service.js.map