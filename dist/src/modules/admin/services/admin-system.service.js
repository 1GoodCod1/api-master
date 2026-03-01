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
var AdminSystemService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSystemService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const redis_service_1 = require("../../shared/redis/redis.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let AdminSystemService = AdminSystemService_1 = class AdminSystemService {
    prisma;
    redis;
    logger = new common_1.Logger(AdminSystemService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getSystemStats() {
        const [totalUsers, totalMasters, totalLeads, totalReviews, totalPayments, newUsersToday, newLeadsToday, newReviewsToday, revenueToday, redisInfo, systemMetrics,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.master.count(),
            this.prisma.lead.count(),
            this.prisma.review.count(),
            this.prisma.payment.count(),
            this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.lead.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.review.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.payment.aggregate({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                    status: constants_1.PaymentStatus.SUCCESS,
                },
                _sum: { amount: true },
            }),
            this.getRedisInfo(),
            this.getSystemMetrics(),
        ]);
        return {
            database: {
                totalUsers,
                totalMasters,
                totalLeads,
                totalReviews,
                totalPayments,
            },
            system: systemMetrics,
            redis: redisInfo,
            daily: {
                newUsers: newUsersToday,
                newLeads: newLeadsToday,
                newReviews: newReviewsToday,
                revenue: Number(revenueToday._sum.amount) || 0,
            },
        };
    }
    async getRedisInfo() {
        try {
            const redis = this.redis.getClient();
            const info = await redis.info();
            const infoObj = {};
            if (typeof info === 'string') {
                info.split('\r\n').forEach((line) => {
                    const [key, value] = line.split(':');
                    if (key && value) {
                        infoObj[key] = value;
                    }
                });
            }
            return {
                connectedClients: parseInt(infoObj['connected_clients']) || 0,
                usedMemory: infoObj['used_memory_human'] || '0B',
                totalCommands: parseInt(infoObj['total_commands_processed']) || 0,
            };
        }
        catch (error) {
            this.logger.error('Failed to get Redis info:', error);
            return {
                connectedClients: 0,
                usedMemory: '0B',
                totalCommands: 0,
            };
        }
    }
    getSystemMetrics() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return Promise.resolve({
            memory: {
                total: this.formatBytes(totalMem),
                used: this.formatBytes(usedMem),
                free: this.formatBytes(freeMem),
                usage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
            },
            cpu: {
                load: os.loadavg(),
                cores: os.cpus().length,
            },
            uptime: this.formatUptime(os.uptime()),
            platform: os.platform(),
        });
    }
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
        const backupData = {
            timestamp: new Date().toISOString(),
            users: await this.prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    isVerified: true,
                    isBanned: true,
                    createdAt: true,
                },
            }),
            masters: await this.prisma.master.findMany({
                select: {
                    id: true,
                    user: { select: { firstName: true, lastName: true } },
                    rating: true,
                    tariffType: true,
                    isFeatured: true,
                    createdAt: true,
                },
            }),
            statistics: await this.getSystemStats(),
        };
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        this.logger.log(`Backup created: ${backupFile}`);
        return {
            success: true,
            filename: `backup-${timestamp}.json`,
            path: backupFile,
            timestamp: backupData.timestamp,
        };
    }
    listBackups() {
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            return Promise.resolve([]);
        }
        const files = fs
            .readdirSync(backupDir)
            .filter((file) => file.endsWith('.json'))
            .map((file) => {
            const stats = fs.statSync(path.join(backupDir, file));
            return {
                filename: file,
                size: this.formatBytes(stats.size),
                modified: stats.mtime,
                created: stats.birthtime,
            };
        })
            .sort((a, b) => b.modified.getTime() - a.modified.getTime());
        return Promise.resolve(files);
    }
    getBackupPath(filename) {
        if (!/^backup-[\d\-TZ]+\.json$/.test(filename)) {
            return Promise.reject(new Error('Invalid backup filename'));
        }
        const backupDir = path.join(process.cwd(), 'backups');
        const backupPath = path.join(backupDir, filename);
        const normalizedBackupPath = path.normalize(backupPath);
        const normalizedBackupDir = path.normalize(backupDir);
        if (!normalizedBackupPath.startsWith(normalizedBackupDir)) {
            return Promise.reject(new Error('Invalid backup path'));
        }
        if (!fs.existsSync(normalizedBackupPath)) {
            return Promise.reject(new Error('Backup file not found'));
        }
        return Promise.resolve({
            backupPath: normalizedBackupPath,
            backupDir: normalizedBackupDir,
        });
    }
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0)
            return '0 Byte';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    }
    formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const parts = [];
        if (days > 0)
            parts.push(`${days}d`);
        if (hours > 0)
            parts.push(`${hours}h`);
        if (minutes > 0)
            parts.push(`${minutes}m`);
        return parts.join(' ') || '< 1m';
    }
};
exports.AdminSystemService = AdminSystemService;
exports.AdminSystemService = AdminSystemService = AdminSystemService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AdminSystemService);
//# sourceMappingURL=admin-system.service.js.map