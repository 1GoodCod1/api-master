import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
export interface SystemStats {
    database: {
        totalUsers: number;
        totalMasters: number;
        totalLeads: number;
        totalReviews: number;
        totalPayments: number;
    };
    system: {
        memory: {
            total: string;
            used: string;
            free: string;
            usage: string;
        };
        cpu: {
            load: number[];
            cores: number;
        };
        uptime: string;
        platform: string;
    };
    redis: {
        connectedClients: number;
        usedMemory: string;
        totalCommands: number;
    };
    daily: {
        newUsers: number;
        newLeads: number;
        newReviews: number;
        revenue: number;
    };
}
export declare class AdminSystemService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    getSystemStats(): Promise<SystemStats>;
    private getRedisInfo;
    private getSystemMetrics;
    createBackup(): Promise<{
        success: boolean;
        filename: string;
        path: string;
        timestamp: string;
    }>;
    listBackups(): Promise<{
        filename: string;
        size: string;
        modified: Date;
        created: Date;
    }[]>;
    getBackupPath(filename: string): Promise<{
        backupPath: string;
        backupDir: string;
    }>;
    formatBytes(bytes: number): string;
    formatUptime(seconds: number): string;
}
