import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { DigestSubscription, UserRole } from '@prisma/client';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
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

    this.logger.log(`Sending digest to ${subs.length} subscribers`);

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
        const rendered = this.templateService.render(templateName, {
          userName: sub.user.firstName ?? undefined,
          lang,
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

    this.logger.log(`Digest sent: ${sent}/${subs.length}`);
    return sent;
  }
}
