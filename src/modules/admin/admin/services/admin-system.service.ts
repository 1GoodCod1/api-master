import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { getStartOfTodayInMoldova } from '../../../shared/utils/timezone.util';
import { RedisService } from '../../../shared/redis/redis.service';
import { StorageService } from '../../../infrastructure/files/services/storage.service';
import * as os from 'os';
import { SORT_ASC } from '../../../../common/constants';
import type { SystemStats } from '../types';

const BACKUP_PREFIX = 'backups/';

/**
 * Сервис для системных операций: бэкапы и мониторинг.
 * Бэкапы хранятся в B2 (прод) или на локальном диске (dev).
 */
@Injectable()
export class AdminSystemService {
  private readonly logger = new Logger(AdminSystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storageService: StorageService,
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
      this.logger.error('Failed to get Redis info:', error);
      return {
        connectedClients: 0,
        usedMemory: '0B',
        totalCommands: 0,
      };
    }
  }

  private async getSystemMetrics(): Promise<{
    memory: { total: string; used: string; free: string; usage: string };
    cpu: { load: number[]; cores: number };
    uptime: string;
    platform: string;
  }> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuLoad = await this.getCpuLoadPercent();

    return {
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
      },
      cpu: {
        load: cpuLoad,
        cores: os.cpus().length,
      },
      uptime: this.formatUptime(os.uptime()),
      platform: os.platform(),
    };
  }

  /**
   * Возвращает реальный процент загрузки каждого ядра CPU.
   * Делает два замера с интервалом 150ms и считает разницу.
   * Работает корректно на Linux (prod) и Windows (dev).
   */
  private getCpuLoadPercent(): Promise<number[]> {
    return new Promise((resolve) => {
      const startSample = os.cpus();
      setTimeout(() => {
        const endSample = os.cpus();
        const loads = startSample.map((startCore, i) => {
          const endCore = endSample[i];
          const startTotal = Object.values(startCore.times).reduce(
            (a, b) => a + b,
            0,
          );
          const endTotal = Object.values(endCore.times).reduce(
            (a, b) => a + b,
            0,
          );
          const totalDiff = endTotal - startTotal;
          if (totalDiff === 0) return 0;
          const idleDiff = endCore.times.idle - startCore.times.idle;
          return parseFloat(((1 - idleDiff / totalDiff) * 100).toFixed(1));
        });
        resolve(loads);
      }, 150);
    });
  }

  // ==================== БЭКАПЫ ====================

  private static readonly BACKUP_PAGE_SIZE = 500;
  private static readonly MAX_BACKUPS = 10;

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const key = `${BACKUP_PREFIX}${filename}`;

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

    const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
    const storagePath = await this.storageService.uploadBuffer(
      key,
      buffer,
      'application/json',
    );

    await this.rotateBackups();

    this.logger.log(`Backup created: ${storagePath}`);

    return {
      success: true,
      filename,
      path: storagePath,
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

  private async rotateBackups(): Promise<void> {
    try {
      const files = await this.storageService.listFiles(BACKUP_PREFIX);
      const jsonFiles = files
        .filter((f) => f.key.endsWith('.json'))
        .sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());

      if (jsonFiles.length <= AdminSystemService.MAX_BACKUPS) return;

      const toDelete = jsonFiles.slice(
        0,
        jsonFiles.length - AdminSystemService.MAX_BACKUPS,
      );
      for (const file of toDelete) {
        try {
          await this.storageService.deleteByKey(file.key);
          this.logger.log(`Rotated old backup: ${file.key}`);
        } catch (err) {
          this.logger.warn(`Failed to delete old backup ${file.key}:`, err);
        }
      }
    } catch (err) {
      this.logger.warn('Backup rotation failed:', err);
    }
  }

  async listBackups(): Promise<
    { filename: string; size: string; modified: Date }[]
  > {
    try {
      const files = await this.storageService.listFiles(BACKUP_PREFIX);
      return files
        .filter((f) => f.key.endsWith('.json'))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .map((f) => ({
          filename: f.key.replace(BACKUP_PREFIX, ''),
          size: this.formatBytes(f.size),
          modified: f.lastModified,
        }));
    } catch {
      return [];
    }
  }

  async downloadBackup(
    filename: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!/^backup-[\d\-TZ]+\.json$/.test(filename)) {
      throw AppErrors.badRequest(AppErrorMessages.BACKUP_INVALID_FILENAME);
    }

    const key = `${BACKUP_PREFIX}${filename}`;
    try {
      const buffer = await this.storageService.getFileBuffer(key);
      return { buffer, contentType: 'application/json' };
    } catch {
      throw AppErrors.notFound(AppErrorMessages.BACKUP_FILE_NOT_FOUND);
    }
  }

  // ==================== УТИЛИТЫ ====================

  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    // Keep 2 decimal places for MB and above so the frontend chart stays accurate
    const formatted = i >= 2 ? value.toFixed(2) : Math.round(value).toString();
    return `${formatted} ${sizes[i]}`;
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
