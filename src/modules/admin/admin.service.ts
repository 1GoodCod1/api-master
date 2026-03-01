import { Injectable, Logger } from '@nestjs/common';
import { AdminUsersService } from './services/admin-users.service';
import { AdminMastersService } from './services/admin-masters.service';
import { AdminLeadsService } from './services/admin-leads.service';
import { AdminReviewsService } from './services/admin-reviews.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import {
  AdminSystemService,
  SystemStats,
} from './services/admin-system.service';
import { TasksActivityService } from '../tasks/services/tasks-activity.service';
import { CacheService } from '../shared/cache/cache.service';

/**
 * Главный сервис админки - координатор для специализированных сервисов
 * Делегирует вызовы соответствующим сервисам
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: AdminUsersService,
    private readonly mastersService: AdminMastersService,
    private readonly leadsService: AdminLeadsService,
    private readonly reviewsService: AdminReviewsService,
    private readonly paymentsService: AdminPaymentsService,
    private readonly auditService: AdminAuditService,
    private readonly analyticsService: AdminAnalyticsService,
    private readonly systemService: AdminSystemService,
    private readonly activityService: TasksActivityService,
    private readonly cache: CacheService,
  ) {}

  // ==================== DASHBOARD ====================

  async getDashboardData() {
    try {
      const [
        systemStats,
        recentUsers,
        recentMasters,
        recentLeads,
        recentPayments,
        activityLogs,
      ] = await Promise.all([
        this.systemService.getSystemStats(),
        this.usersService.getRecentUsers(),
        this.mastersService.getRecentMasters(),
        this.leadsService.getRecentLeads(),
        this.paymentsService.getRecentPayments(),
        this.auditService.getRecentActivity(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        stats: systemStats,
        recent: {
          users: recentUsers,
          masters: recentMasters,
          leads: recentLeads,
          payments: recentPayments,
        },
        activity: activityLogs,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    return this.systemService.getSystemStats();
  }

  // ==================== ПОЛЬЗОВАТЕЛИ ====================

  async getUsers(filters?: {
    role?: string;
    verified?: string | boolean;
    banned?: string | boolean;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.usersService.getUsers(filters);
  }

  async updateUser(
    userId: string,
    data: {
      isVerified?: boolean;
      isBanned?: boolean;
      role?: string;
    },
  ) {
    return this.usersService.updateUser(userId, data);
  }

  // ==================== МАСТЕРА ====================

  async getMasters(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.mastersService.getMasters(filters);
  }

  async updateMaster(
    masterId: string,
    data: {
      isFeatured?: boolean;
      tariffType?: string;
    },
  ) {
    return this.mastersService.updateMaster(masterId, data);
  }

  // ==================== КОНТЕНТ ====================

  async getLeads(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.leadsService.getLeads(filters);
  }

  async getReviews(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.reviewsService.getReviews(filters);
  }

  async moderateReview(reviewId: string, status: string, reason?: string) {
    return this.reviewsService.moderateReview(reviewId, status, reason);
  }

  async getPayments(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.paymentsService.getPayments(filters);
  }

  // ==================== АНАЛИТИКА ====================

  async getAnalytics(timeframe: 'day' | 'week' | 'month' = 'day') {
    return this.analyticsService.getAnalytics(timeframe);
  }

  // ==================== СИСТЕМА И БЭКАПЫ ====================

  async createBackup() {
    return this.systemService.createBackup();
  }

  async listBackups() {
    return this.systemService.listBackups();
  }

  async getBackupPath(filename: string) {
    return this.systemService.getBackupPath(filename);
  }

  /** Сброс кэша тарифов (после сида или если список пустой из кэша) */
  async invalidateTariffsCache(): Promise<{ invalidated: number }> {
    const invalidated = await this.cache.invalidate('cache:tariffs:all:*');
    this.logger.log(`Tariffs cache invalidated, keys removed: ${invalidated}`);
    return { invalidated };
  }

  // ==================== СТАТИСТИКА АКТИВНОСТИ МАСТЕРОВ ====================

  async getInactivityStats(): Promise<{
    totalInactive: number;
    totalDeactivated: number;
    thresholdDays: number;
    ratingPenalty: number;
  }> {
    return this.activityService.getInactivityStats();
  }
}
