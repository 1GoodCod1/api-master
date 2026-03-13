import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
  };
}

/**
 * Сервис для системных операций: бэкапы и мониторинг
 */
@Injectable()
export class AdminSystemService {
  private readonly logger = new Logger(AdminSystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ==================== СИСТЕМНАЯ ИНФОРМАЦИЯ ====================

  async getSystemStats(): Promise<SystemStats> {
    const [
      totalUsers,
      totalMasters,
      totalLeads,
      totalReviews,
      totalPayments,
      newUsersToday,
      newLeadsToday,
      newReviewsToday,
      redisInfo,
      systemMetrics,
    ] = await Promise.all([
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
      },
    };
  }

  private async getRedisInfo() {
    try {
      const redis = this.redis.getClient();
      const info = await redis.info();

      const infoObj: Record<string, string> = {};
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
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return {
        connectedClients: 0,
        usedMemory: '0B',
        totalCommands: 0,
      };
    }
  }

  private getSystemMetrics(): Promise<{
    memory: { total: string; used: string; free: string; usage: string };
    cpu: { load: number[]; cores: number };
    uptime: string;
    platform: string;
  }> {
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

  // ==================== БЭКАПЫ ====================

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

  listBackups(): Promise<
    { filename: string; size: string; modified: Date; created: Date }[]
  > {
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

  getBackupPath(
    filename: string,
  ): Promise<{ backupPath: string; backupDir: string }> {
    // Валидация имени файла
    if (!/^backup-[\d\-TZ]+\.json$/.test(filename)) {
      return Promise.reject(new Error('Invalid backup filename'));
    }

    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, filename);

    // Нормализация путей для защиты от path traversal
    const normalizedBackupPath = path.normalize(backupPath);
    const normalizedBackupDir = path.normalize(backupDir);

    // Проверка что файл находится в директории backups
    if (!normalizedBackupPath.startsWith(normalizedBackupDir)) {
      return Promise.reject(new Error('Invalid backup path'));
    }

    // Проверка существования файла
    if (!fs.existsSync(normalizedBackupPath)) {
      return Promise.reject(new Error('Backup file not found'));
    }

    return Promise.resolve({
      backupPath: normalizedBackupPath,
      backupDir: normalizedBackupDir,
    });
  }

  // ==================== УТИЛИТЫ ====================

  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  }
}
