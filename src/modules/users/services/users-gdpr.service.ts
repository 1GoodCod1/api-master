import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { GDPR_PAGE_SIZE } from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT } from '../../audit/audit.events';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';
import type {
  PersonalDataPdfData,
  PersonalDataPdfUser,
  PersonalDataPdfMasterProfile,
  PersonalDataPdfLead,
  PersonalDataPdfReview,
  PersonalDataPdfBooking,
  PersonalDataPdfLoginEntry,
  PersonalDataPdfNotification,
  PersonalDataPdfConsent,
} from '../types';

@Injectable()
export class UsersGdprService {
  private readonly logger = new Logger(UsersGdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * GDPR Art. 17 — право на удаление собственного аккаунта.
   */
  async removeSelf(userId: string): Promise<{ ok: true }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
      }

      if (user.role === UserRole.ADMIN) {
        throw AppErrors.badRequest(AppErrorMessages.GDPR_ADMIN_NO_SELF_DELETE);
      }

      await this.prisma.user.delete({ where: { id: userId } });
      await this.invalidateCache(userId);

      this.eventEmitter.emit(AUDIT_EVENT, {
        userId: userId,
        action: AuditAction.USER_SELF_DELETED,
        entityType: AuditEntityType.User,
        entityId: userId,
      });

      this.logger.log(
        `User ${userId} self-deleted their account (GDPR erasure)`,
      );
      return { ok: true };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('removeSelf failed', err);
      throw err;
    }
  }

  /**
   * GDPR Art. 20 — право на переносимость данных.
   * Возвращает данные для PDF-экспорта.
   */
  async getPersonalDataForPdf(userId: string): Promise<PersonalDataPdfData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
    }

    const masterProfile = await this.prisma.master.findUnique({
      where: { userId },
      include: {
        city: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const masterId = masterProfile?.id;
    const isMaster = user.role === UserRole.MASTER && masterId;

    const leadWhere = isMaster ? { masterId } : { clientId: userId };
    const reviewWhere = isMaster ? { masterId } : { clientId: userId };
    const bookingWhere = isMaster ? { masterId } : { clientId: userId };

    const [leads, reviews, bookings, loginHistory, notifications, consents] =
      await Promise.all([
        this.fetchPaginated(this.prisma.lead, leadWhere, {
          message: true,
          clientPhone: true,
          clientName: true,
          status: true,
          createdAt: true,
        } as const),
        this.fetchPaginated(this.prisma.review, reviewWhere, {
          rating: true,
          comment: true,
          clientPhone: true,
          clientName: true,
          createdAt: true,
        } as const),
        this.fetchPaginated(this.prisma.booking, bookingWhere, {
          clientPhone: true,
          clientName: true,
          startTime: true,
          endTime: true,
          status: true,
          createdAt: true,
        } as const),
        this.prisma.loginHistory.findMany({
          where: { userId },
          select: {
            ipAddress: true,
            userAgent: true,
            location: true,
            success: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        this.prisma.notification.findMany({
          where: { userId },
          select: {
            type: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.userConsent.findMany({
          where: { userId },
          select: {
            consentType: true,
            granted: true,
            version: true,
            revokedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const exportDate = new Date().toISOString();

    const pdfUser: PersonalDataPdfUser = {
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };

    const pdfMasterProfile: PersonalDataPdfMasterProfile | null = masterProfile
      ? {
          description: masterProfile.description,
          experienceYears: masterProfile.experienceYears ?? 0,
          cityName: masterProfile.city?.name ?? null,
          categoryName: masterProfile.category?.name ?? null,
          whatsappPhone: masterProfile.whatsappPhone,
          createdAt: masterProfile.createdAt.toISOString(),
        }
      : null;

    const pdfLeads: PersonalDataPdfLead[] = leads.map((l) => ({
      message: l.message,
      clientPhone: l.clientPhone,
      clientName: l.clientName,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    }));

    const pdfReviews: PersonalDataPdfReview[] = reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      clientPhone: r.clientPhone,
      clientName: r.clientName,
      createdAt: r.createdAt.toISOString(),
    }));

    const pdfBookings: PersonalDataPdfBooking[] = bookings.map((b) => ({
      clientPhone: b.clientPhone,
      clientName: b.clientName,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    }));

    const pdfLoginHistory: PersonalDataPdfLoginEntry[] = loginHistory.map(
      (h) => ({
        ipAddress: h.ipAddress,
        userAgent: h.userAgent,
        location: h.location,
        success: h.success,
        createdAt: h.createdAt.toISOString(),
      }),
    );

    const pdfNotifications: PersonalDataPdfNotification[] = notifications.map(
      (n) => ({
        type: n.type,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      }),
    );

    const pdfConsents: PersonalDataPdfConsent[] = consents.map((c) => ({
      consentType: c.consentType,
      granted: c.granted,
      version: c.version,
      revokedAt: c.revokedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: userId,
      action: AuditAction.USER_DATA_EXPORTED,
      entityType: AuditEntityType.User,
      entityId: userId,
    });

    return {
      exportDate,
      user: pdfUser,
      masterProfile: pdfMasterProfile,
      leads: pdfLeads,
      reviews: pdfReviews,
      bookings: pdfBookings,
      loginHistory: pdfLoginHistory,
      notifications: pdfNotifications,
      consents: pdfConsents,
    };
  }

  /**
   * Generic cursor-based paginated fetcher.
   * Replaces duplicate fetchLeadsPaginated / fetchReviewsPaginated / fetchBookingsPaginated.
   */

  private async fetchPaginated<T extends { id: string }>(
    model: { findMany: (args: any) => Promise<T[]> },
    where: Record<string, unknown>,
    select: Record<string, boolean>,
  ): Promise<Omit<T, 'id'>[]> {
    const results: Omit<T, 'id'>[] = [];
    let cursor: { id: string } | undefined;

    do {
      const batch: T[] = await model.findMany({
        take: GDPR_PAGE_SIZE,
        ...(cursor ? { cursor, skip: 1 } : {}),
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { ...select, id: true },
      });
      results.push(...batch.map(({ id: _id, ...rest }) => rest));
      const last = batch[batch.length - 1];
      cursor =
        batch.length === GDPR_PAGE_SIZE && last ? { id: last.id } : undefined;
    } while (cursor);

    return results;
  }

  private async invalidateCache(userId: string) {
    await this.cache.invalidateUser(userId);
  }
}
