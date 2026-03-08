import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import type { TemplateContext } from './templates';
import { UserRole } from '@prisma/client';

type UserRecipient = {
  id: string;
  email: string;
  firstName: string | null;
  preferredLanguage: string | null;
};

export type BroadcastSegment =
  | 'all_masters'
  | 'new_masters'
  | 'all_clients'
  | 'digest_subscribers';

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  preferredLanguage: true,
} as const satisfies Prisma.UserSelect;

@Injectable()
export class EmailBroadcastService {
  private readonly logger = new Logger(EmailBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
  ) {}

  /**
   * Send email to all masters
   */
  async sendToMasters(
    templateName: string,
    context: TemplateContext = {},
  ): Promise<BroadcastResult> {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.MASTER, isBanned: false },
      select: userSelect,
    });
    return this.sendToUsers(users as UserRecipient[], templateName, context);
  }

  /**
   * Send email to masters registered after sinceDate
   */
  async sendToNewMasters(
    templateName: string,
    sinceDate: Date,
    context: TemplateContext = {},
  ): Promise<BroadcastResult> {
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.MASTER,
        isBanned: false,
        createdAt: { gte: sinceDate },
      },
      select: userSelect,
    });
    return this.sendToUsers(users as UserRecipient[], templateName, context);
  }

  /**
   * Send email to all clients
   */
  async sendToClients(
    templateName: string,
    context: TemplateContext = {},
  ): Promise<BroadcastResult> {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.CLIENT, isBanned: false },
      select: userSelect,
    });
    return this.sendToUsers(users as UserRecipient[], templateName, context);
  }

  /**
   * Send email to digest subscribers only
   */
  async sendToDigestSubscribers(
    templateName: string,
    context: TemplateContext = {},
  ): Promise<BroadcastResult> {
    const users = await this.prisma.user.findMany({
      where: { digestSubscription: { isNot: null }, isBanned: false },
      select: userSelect,
    });
    return this.sendToUsers(users as UserRecipient[], templateName, context);
  }

  /**
   * Send broadcast by segment
   */
  async sendBroadcast(
    segment: BroadcastSegment,
    templateName: string,
    options?: { sinceDate?: string },
    context: TemplateContext = {},
  ): Promise<BroadcastResult> {
    const allowed = this.getAvailableTemplates();
    if (!allowed.includes(templateName)) {
      throw new Error(
        `Invalid template: ${templateName}. Allowed: ${allowed.join(', ')}`,
      );
    }

    switch (segment) {
      case 'all_masters':
        return this.sendToMasters(templateName, context);
      case 'new_masters': {
        const since = options?.sinceDate
          ? new Date(options.sinceDate)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days
        return this.sendToNewMasters(templateName, since, context);
      }
      case 'all_clients':
        return this.sendToClients(templateName, context);
      case 'digest_subscribers':
        return this.sendToDigestSubscribers(templateName, context);
      default:
        throw new Error('Unknown segment: ' + String(segment));
    }
  }

  private async sendToUsers(
    users: UserRecipient[],
    templateName: string,
    context: TemplateContext,
  ): Promise<BroadcastResult> {
    const total = users.length;
    if (total === 0) {
      this.logger.log(`Broadcast ${templateName}: no recipients`);
      return { total: 0, sent: 0, failed: 0 };
    }

    this.logger.log(`Broadcast ${templateName}: sending to ${total} users`);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const lang: 'en' | 'ru' | 'ro' =
          user.preferredLanguage &&
          ['en', 'ru', 'ro'].includes(user.preferredLanguage)
            ? (user.preferredLanguage as 'en' | 'ru' | 'ro')
            : 'ro';
        const ctx: TemplateContext = {
          ...context,
          userName: user.firstName ?? undefined,
          lang,
        };
        const rendered = this.templateService.render(templateName, ctx);
        await this.emailService.sendEmail(
          user.email,
          rendered.subject,
          rendered.html,
          rendered.text,
        );
        sent++;
      } catch (err) {
        failed++;
        this.logger.error(`Broadcast failed for ${user.email}: ${String(err)}`);
      }
    }

    this.logger.log(
      `Broadcast ${templateName}: sent=${sent}, failed=${failed}`,
    );
    return { total, sent, failed };
  }

  /**
   * List available broadcast templates (excluding drip-only templates)
   */
  getAvailableTemplates(): string[] {
    return [
      'new-feature-masters',
      'digest-client',
      'digest-master',
      'master-welcome-1',
      'master-welcome-2',
      'welcome-1',
      'welcome-2',
      'reengagement',
    ];
  }
}
