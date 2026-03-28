import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { getStartOfTodayInMoldova } from '../../../shared/utils/timezone.util';
import { RedisService } from '../../../shared/redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SORT_ASC } from '../../../shared/constants/sort-order.constants';

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
            gte: getStartOfTodayInMoldova(),
          },
        },
      }),
      this.prisma.lead.count({
        where: {
          createdAt: {
            gte: getStartOfTodayInMoldova(),
          },
        },
      }),
      this.prisma.review.count({
        where: {
          createdAt: {
            gte: getStartOfTodayInMoldova(),
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
      this.logger.error('Ошибка получения Redis info:', error);
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

  private static readonly BACKUP_PAGE_SIZE = 500;
  private static readonly MAX_BACKUPS = 10;

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    await fs.promises.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const [users, masters, statistics] = await Promise.all([
      this.fetchUsersPaginated(),
      this.fetchMastersPaginated(),
      this.getSystemStats(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      masters,
      statistics,
    };

    await fs.promises.writeFile(
      backupFile,
      JSON.stringify(backupData, null, 2),
    );

    await this.rotateBackups(backupDir);

    this.logger.log(`Backup created: ${backupFile}`);

    return {
      success: true,
      filename: `backup-${timestamp}.json`,
      path: backupFile,
      timestamp: backupData.timestamp,
    };
  }

  private async fetchUsersPaginated() {
    const users: Array<{
      id: string;
      email: string;
      phone: string | null;
      role: string;
      isVerified: boolean;
      isBanned: boolean;
      createdAt: Date;
    }> = [];
    let cursor: string | undefined;
    const take = AdminSystemService.BACKUP_PAGE_SIZE;

    do {
      const batch = await this.prisma.user.findMany({
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: SORT_ASC },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isBanned: true,
          createdAt: true,
        },
      });
      users.push(...batch);
      cursor = batch.length === take ? batch[batch.length - 1]?.id : undefined;
    } while (cursor);

    return users;
  }

  private async fetchMastersPaginated() {
    const masters: Array<{
      id: string;
      user: { firstName: string | null; lastName: string | null };
      rating: number;
      tariffType: string;
      isFeatured: boolean;
      createdAt: Date;
    }> = [];
    let cursor: string | undefined;
    const take = AdminSystemService.BACKUP_PAGE_SIZE;

    do {
      const batch = await this.prisma.master.findMany({
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: SORT_ASC },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
          rating: true,
          tariffType: true,
          isFeatured: true,
          createdAt: true,
        },
      });
      masters.push(...batch);
      cursor = batch.length === take ? batch[batch.length - 1]?.id : undefined;
    } while (cursor);

    return masters;
  }

  private async rotateBackups(backupDir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.promises.readdir(backupDir);
    } catch {
      return;
    }
    const jsonFiles = entries.filter((file) => file.endsWith('.json'));
    if (jsonFiles.length <= AdminSystemService.MAX_BACKUPS) return;

    const filesWithStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const stats = await fs.promises.stat(path.join(backupDir, file));
        return { file, mtime: stats.mtime };
      }),
    );
    const sorted = filesWithStats.sort(
      (a, b) => a.mtime.getTime() - b.mtime.getTime(),
    );
    const toDelete = sorted.slice(
      0,
      sorted.length - AdminSystemService.MAX_BACKUPS,
    );
    for (const { file } of toDelete) {
      try {
        await fs.promises.unlink(path.join(backupDir, file));
        this.logger.log(`Rotated old backup: ${file}`);
      } catch (err) {
        this.logger.warn(`Failed to delete old backup ${file}:`, err);
      }
    }
  }

  async listBackups(): Promise<
    { filename: string; size: string; modified: Date; created: Date }[]
  > {
    const backupDir = path.join(process.cwd(), 'backups');

    let entries: string[];
    try {
      entries = await fs.promises.readdir(backupDir);
    } catch {
      return [];
    }

    const jsonFiles = entries.filter((file) => file.endsWith('.json'));
    const filesWithStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const stats = await fs.promises.stat(path.join(backupDir, file));
        return {
          filename: file,
          size: this.formatBytes(stats.size),
          modified: stats.mtime,
          created: stats.birthtime,
        };
      }),
    );

    return filesWithStats.sort(
      (a, b) => b.modified.getTime() - a.modified.getTime(),
    );
  }

  async getBackupPath(
    filename: string,
  ): Promise<{ backupPath: string; backupDir: string }> {
    if (!/^backup-[\d\-TZ]+\.json$/.test(filename)) {
      throw new BadRequestException('Invalid backup filename');
    }

    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, filename);

    const normalizedBackupPath = path.normalize(backupPath);
    const normalizedBackupDir = path.normalize(backupDir);

    if (!normalizedBackupPath.startsWith(normalizedBackupDir)) {
      throw new BadRequestException('Invalid backup path');
    }

    try {
      await fs.promises.access(normalizedBackupPath, fs.constants.F_OK);
    } catch {
      throw new NotFoundException('Backup file not found');
    }

    return {
      backupPath: normalizedBackupPath,
      backupDir: normalizedBackupDir,
    };
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
