import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import type {
  PersonalDataPdfData,
  PersonalDataPdfUser,
  PersonalDataPdfMasterProfile,
  PersonalDataPdfLead,
  PersonalDataPdfReview,
  PersonalDataPdfBooking,
  PersonalDataPdfLoginEntry,
  PersonalDataPdfNotification,
} from './personal-data-pdf.builder';

@Injectable()
export class UsersGdprService {
  private readonly logger = new Logger(UsersGdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
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

    const [leads, reviews, bookings, loginHistory, notifications] =
      await Promise.all([
        this.prisma.lead.findMany({
          where: isMaster ? { masterId } : { clientId: userId },
          select: {
            message: true,
            clientPhone: true,
            clientName: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.review.findMany({
          where: isMaster ? { masterId } : { clientId: userId },
          select: {
            rating: true,
            comment: true,
            clientPhone: true,
            clientName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.booking.findMany({
          where: isMaster ? { masterId } : { clientId: userId },
          select: {
            clientPhone: true,
            clientName: true,
            startTime: true,
            endTime: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
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

    return {
      exportDate,
      user: pdfUser,
      masterProfile: pdfMasterProfile,
      leads: pdfLeads,
      reviews: pdfReviews,
      bookings: pdfBookings,
      loginHistory: pdfLoginHistory,
      notifications: pdfNotifications,
    };
  }

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
