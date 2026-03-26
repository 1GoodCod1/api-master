import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { AuditService } from '../../audit/audit.service';
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
} from './personal-data-pdf.builder';

const GDPR_PAGE_SIZE = 500;

@Injectable()
export class UsersGdprService {
  private readonly logger = new Logger(UsersGdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
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
        throw new NotFoundException('User not found');
      }

      if (user.role === 'ADMIN') {
        throw new BadRequestException(
          'Admin accounts cannot be self-deleted. Contact another admin.',
        );
      }

      await this.prisma.user.delete({ where: { id: userId } });
      await this.invalidateCache(userId);

      await this.auditService.log({
        userId: userId,
        action: 'USER_SELF_DELETED',
        entityType: 'User',
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
      throw new NotFoundException('User not found');
    }

    const masterProfile = await this.prisma.master.findUnique({
      where: { userId },
      include: {
        city: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const masterId = masterProfile?.id;
    const isMaster = user.role === 'MASTER' && masterId;

    const leadWhere = isMaster ? { masterId } : { clientId: userId };
    const reviewWhere = isMaster ? { masterId } : { clientId: userId };
    const bookingWhere = isMaster ? { masterId } : { clientId: userId };

    const [leads, reviews, bookings, loginHistory, notifications, consents] =
      await Promise.all([
        this.fetchLeadsPaginated(leadWhere),
        this.fetchReviewsPaginated(reviewWhere),
        this.fetchBookingsPaginated(bookingWhere),
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

    await this.auditService.log({
      userId: userId,
      action: 'USER_DATA_EXPORTED',
      entityType: 'User',
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

  private async fetchLeadsPaginated(
    where: { masterId: string } | { clientId: string },
  ) {
    const results: Array<{
      message: string;
      clientPhone: string;
      clientName: string | null;
      status: string;
      createdAt: Date;
    }> = [];
    let cursor: { id: string } | undefined;

    do {
      const batch = await this.prisma.lead.findMany({
        take: GDPR_PAGE_SIZE,
        ...(cursor ? { cursor, skip: 1 } : {}),
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          message: true,
          clientPhone: true,
          clientName: true,
          status: true,
          createdAt: true,
          id: true,
        },
      });
      results.push(...batch.map(({ id: _id, ...r }) => r));
      const last = batch[batch.length - 1];
      cursor =
        batch.length === GDPR_PAGE_SIZE && last ? { id: last.id } : undefined;
    } while (cursor);

    return results;
  }

  private async fetchReviewsPaginated(
    where: { masterId: string } | { clientId: string },
  ) {
    const results: Array<{
      rating: number;
      comment: string | null;
      clientPhone: string;
      clientName: string | null;
      createdAt: Date;
    }> = [];
    let cursor: { id: string } | undefined;

    do {
      const batch = await this.prisma.review.findMany({
        take: GDPR_PAGE_SIZE,
        ...(cursor ? { cursor, skip: 1 } : {}),
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          rating: true,
          comment: true,
          clientPhone: true,
          clientName: true,
          createdAt: true,
          id: true,
        },
      });
      results.push(...batch.map(({ id: _id, ...r }) => r));
      const last = batch[batch.length - 1];
      cursor =
        batch.length === GDPR_PAGE_SIZE && last ? { id: last.id } : undefined;
    } while (cursor);

    return results;
  }

  private async fetchBookingsPaginated(
    where: { masterId: string } | { clientId: string },
  ) {
    const results: Array<{
      clientPhone: string;
      clientName: string | null;
      startTime: Date;
      endTime: Date;
      status: string;
      createdAt: Date;
    }> = [];
    let cursor: { id: string } | undefined;

    do {
      const batch = await this.prisma.booking.findMany({
        take: GDPR_PAGE_SIZE,
        ...(cursor ? { cursor, skip: 1 } : {}),
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          clientPhone: true,
          clientName: true,
          startTime: true,
          endTime: true,
          status: true,
          createdAt: true,
          id: true,
        },
      });
      results.push(...batch.map(({ id: _id, ...r }) => r));
      const last = batch[batch.length - 1];
      cursor =
        batch.length === GDPR_PAGE_SIZE && last ? { id: last.id } : undefined;
    } while (cursor);

    return results;
  }

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
