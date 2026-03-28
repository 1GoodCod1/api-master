import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_DESC } from '../../shared/constants/sort-order.constants';
import { EmailService } from '../../email/email.service';
import { EmailTemplateService } from '../../email/email-template.service';
import { AppSettingsService } from '../../app-settings/app-settings.service';
import { DigestSubscription, UserRole } from '@prisma/client';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
    private readonly appSettings: AppSettingsService,
  ) {}

  async subscribe(userId: string): Promise<DigestSubscription> {
    return this.prisma.digestSubscription.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async getStatus(userId: string): Promise<{ subscribed: boolean }> {
    const sub = await this.prisma.digestSubscription.findUnique({
      where: { userId },
    });
    return { subscribed: !!sub };
  }

  /** Admin: count of digest subscribers */
  async getSubscriberCount(): Promise<number> {
    return this.prisma.digestSubscription.count();
  }

  /** Admin: paginated list of subscribers */
  async getSubscribers(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.digestSubscription.findMany({
        skip,
        take: limit,
        orderBy: { subscribedAt: SORT_DESC },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              preferredLanguage: true,
            },
          },
        },
      }),
      this.prisma.digestSubscription.count(),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async unsubscribe(userId: string): Promise<void> {
    await this.prisma.digestSubscription.deleteMany({
      where: { userId },
    });
  }

  /**
   * Send digest to all subscribers. Role-based templates: digest-client / digest-master.
   * Called by TasksDigestService (cron).
   */
  async sendDigestToAllSubscribers(): Promise<number> {
    const subs = await this.prisma.digestSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            role: true,
            preferredLanguage: true,
          },
        },
      },
    });

    if (subs.length === 0) return 0;

    this.logger.log(`Отправка дайджеста ${subs.length} подписчикам`);

    const announcement = await this.appSettings.getDigestAnnouncement();

    let sent = 0;
    for (const sub of subs) {
      try {
        const templateName =
          sub.user.role === UserRole.MASTER ? 'digest-master' : 'digest-client';
        const lang: 'en' | 'ru' | 'ro' =
          sub.user.preferredLanguage &&
          ['en', 'ru', 'ro'].includes(sub.user.preferredLanguage)
            ? (sub.user.preferredLanguage as 'en' | 'ru' | 'ro')
            : 'ro';
        const rendered = await this.templateService.render(templateName, {
          userName: sub.user.firstName ?? undefined,
          lang,
          announcement: announcement || undefined,
        });
        await this.emailService.sendEmail(
          sub.user.email,
          rendered.subject,
          rendered.html,
          rendered.text,
        );
        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to send digest to ${sub.user.email}: ${String(err)}`,
        );
      }
    }

    this.logger.log(`Дайджест отправлен: ${sent}/${subs.length}`);
    return sent;
  }
}
