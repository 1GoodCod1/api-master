import { Injectable, Logger } from '@nestjs/common';
import { AdminUsersService } from './services/admin-users.service';
import { AdminMastersService } from './services/admin-masters.service';
import {
  AdminLeadsService,
  type AdminLeadsStats,
} from './services/admin-leads.service';
import {
  AdminReviewsService,
  type AdminReviewsStats,
} from './services/admin-reviews.service';
import {
  AdminPaymentsService,
  type AdminPaymentsStats,
} from './services/admin-payments.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import {
  AdminSystemService,
  SystemStats,
} from './services/admin-system.service';
import { TasksActivityService } from '../../infrastructure/tasks/services/tasks-activity.service';
import { CacheService } from '../../shared/cache/cache.service';
import { AppSettingsService } from '../../app-settings/app-settings.service';
import {
  EmailBroadcastService,
  type BroadcastResult,
  type BroadcastSegment,
} from '../../email/email-broadcast.service';
import { EmailTemplateService } from '../../email/email-template.service';
import { DigestService } from '../../notifications/digest/digest.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailTemplateOverrideRepository } from './services/email-template-override.repository';

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
    private readonly appSettings: AppSettingsService,
    private readonly emailBroadcast: EmailBroadcastService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly digestService: DigestService,
    private readonly prisma: PrismaService,
    private readonly emailTemplateOverrideRepo: EmailTemplateOverrideRepository,
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

  async getUsersStats(filters?: {
    role?: string;
    verified?: string | boolean;
    banned?: string | boolean;
  }) {
    return this.usersService.getUsersStats(filters);
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

  async getMastersStats(filters?: {
    verified?: boolean;
    featured?: boolean;
    tariff?: string;
  }) {
    return this.mastersService.getMastersStats(filters);
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

  async getLeadsStats(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AdminLeadsStats> {
    return this.leadsService.getLeadsStats(filters);
  }

  async getLeadsExport(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    return await this.leadsService.getLeadsExport(filters);
  }

  async getReviews(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    return this.reviewsService.getReviews(filters);
  }

  async getReviewsStats(): Promise<AdminReviewsStats> {
    return this.reviewsService.getReviewsStats();
  }

  async getReviewsExport(filters?: { status?: string }) {
    return this.reviewsService.getReviewsExport(filters);
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

  async getPaymentsStats(): Promise<AdminPaymentsStats> {
    return this.paymentsService.getPaymentsStats();
  }

  async getPaymentsExport(filters?: { status?: string }) {
    return this.paymentsService.getPaymentsExport(filters);
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

  async isReferralsEnabled(): Promise<boolean> {
    return this.appSettings.isReferralsEnabled();
  }

  async setReferralsEnabled(enabled: boolean): Promise<boolean> {
    return this.appSettings.setReferralsEnabled(enabled);
  }

  /** Сброс кэша тарифов (после сида или если список пустой из кэша) */
  async invalidateTariffsCache(): Promise<{ invalidated: number }> {
    const invalidated = await this.cache.invalidate(
      this.cache.patterns.tariffsAll(),
    );
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

  // ==================== EMAIL BROADCAST ====================

  async sendEmailBroadcast(
    segment: BroadcastSegment,
    templateName: string,
    options?: { sinceDate?: string },
  ): Promise<BroadcastResult> {
    return this.emailBroadcast.sendBroadcast(segment, templateName, options);
  }

  getBroadcastTemplates(): string[] {
    return this.emailBroadcast.getAvailableTemplates();
  }

  // ==================== DIGEST ====================

  async getDigestStats(): Promise<{ subscriberCount: number }> {
    const subscriberCount = await this.digestService.getSubscriberCount();
    return { subscriberCount };
  }

  async sendDigestNow(): Promise<{ sent: number }> {
    const sent = await this.digestService.sendDigestToAllSubscribers();
    return { sent };
  }

  async getDigestSubscribers(params: { page?: number; limit?: number }) {
    return this.digestService.getSubscribers(params);
  }

  async adminUnsubscribeDigest(userId: string): Promise<void> {
    await this.digestService.unsubscribe(userId);
  }

  async getDigestAnnouncement(): Promise<string> {
    return this.appSettings.getDigestAnnouncement();
  }

  async setDigestAnnouncement(value: string): Promise<string> {
    return this.appSettings.setDigestAnnouncement(value);
  }

  getTemplateDefault(
    templateId: string,
    lang: string,
  ): Promise<{ subject: string; bodyHtml: string } | null> {
    const validLang = ['en', 'ru', 'ro'].includes(lang)
      ? (lang as 'en' | 'ru' | 'ro')
      : 'ro';
    return Promise.resolve(
      this.emailTemplateService.renderDefault(templateId, validLang),
    );
  }

  getTemplateIds(): string[] {
    return this.emailTemplateService.getTemplateIds();
  }

  async getTemplateOverrides() {
    return this.emailTemplateOverrideRepo.findMany();
  }

  async getTemplateOverride(
    templateId: string,
    lang: string,
  ): Promise<{ subject: string | null; bodyHtml: string | null } | null> {
    return this.emailTemplateOverrideRepo.findUnique(templateId, lang);
  }

  async setTemplateOverride(
    templateId: string,
    lang: string,
    data: { subject?: string; bodyHtml?: string },
  ): Promise<void> {
    await this.emailTemplateOverrideRepo.upsert(templateId, lang, data);
  }
}
