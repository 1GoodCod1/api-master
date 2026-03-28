import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseAppLocale } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import type { TemplateContext } from './templates';
import type { ChainStep } from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Копируем из metadata только примитивы, чтобы не тащить небезопасный JsonValue в шаблон */
function toTemplateContext(metadata: Record<string, unknown>): TemplateContext {
  const ctx: TemplateContext = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null ||
      v === undefined
    ) {
      ctx[k] = v;
    }
  }
  return ctx;
}

const CHAINS: Record<string, ChainStep[]> = {
  // Временно отключено — нет welcome drip
  welcome: [],
  // Временно отключено — нет drip по новому лиду
  lead_created: [],
  // Временно отключено — нет письма с просьбой отзыва после закрытия
  lead_closed: [],
  reengagement: [
    { template: 'reengagement', delayMs: 0 }, // сразу (триггер после 14 дн. неактивности)
  ],
  // Временно отключено — нет onboarding drip для мастера
  master_welcome: [],
};

@Injectable()
export class EmailDripService {
  private readonly logger = new Logger(EmailDripService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
  ) {}

  /**
   * Запустить новую drip-цепочку для пользователя
   */
  async startChain(
    userId: string,
    chainType: string,
    context: TemplateContext = {},
  ) {
    const chain = CHAINS[chainType];
    if (!chain) {
      this.logger.warn(`Unknown chain type: ${chainType}`);
      return;
    }
    if (chain.length === 0) {
      this.logger.debug(`Drip chain '${chainType}' is disabled (empty)`);
      return;
    }

    // Уже есть активная цепочка?
    const existing = await this.prisma.emailDripStatus.findUnique({
      where: { userId_chainType: { userId, chainType } },
    });

    if (existing?.status === 'ACTIVE') {
      this.logger.debug(`Chain ${chainType} already active for user ${userId}`);
      return;
    }
    // Reengagement: не перезапускать после COMPLETED (без ежедневного спама)
    if (chainType === 'reengagement' && existing?.status === 'COMPLETED') {
      this.logger.debug(`Reengagement already sent for user ${userId}`);
      return;
    }

    // Первый шаг сразу, если delay = 0
    const firstStep = chain[0];
    if (firstStep.delayMs === 0) {
      await this.sendStep(userId, chainType, 0, context);
    }

    // Время следующей отправки
    const nextStep = chain.length > 1 ? chain[1] : null;
    const nextSendAt = nextStep
      ? new Date(Date.now() + nextStep.delayMs)
      : null;

    const nextStepIndex = firstStep.delayMs === 0 ? 1 : 0;
    const status = nextStepIndex >= chain.length ? 'COMPLETED' : 'ACTIVE';

    await this.prisma.emailDripStatus.upsert({
      where: { userId_chainType: { userId, chainType } },
      create: {
        userId,
        chainType,
        step: nextStepIndex,
        status,
        metadata: context as unknown as Prisma.InputJsonValue,
        nextSendAt,
      },
      update: {
        step: nextStepIndex,
        status,
        metadata: context as unknown as Prisma.InputJsonValue,
        nextSendAt,
      },
    });

    this.logger.log(`Started chain '${chainType}' for user ${userId}`);
  }

  /**
   * Обработать отложенные drip-письма (CRON / планировщик)
   */
  async processPendingDrips() {
    const now = new Date();

    const pendingDrips = await this.prisma.emailDripStatus.findMany({
      where: {
        status: 'ACTIVE',
        nextSendAt: { lte: now },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            preferredLanguage: true,
          },
        },
      },
      take: 50, // пакетами
    });

    this.logger.log(`Processing ${pendingDrips.length} pending drip emails`);

    for (const drip of pendingDrips) {
      try {
        const chain = CHAINS[drip.chainType];
        if (!chain || drip.step >= chain.length) {
          await this.prisma.emailDripStatus.update({
            where: { id: drip.id },
            data: { status: 'COMPLETED' },
          });
          continue;
        }

        const metadata = isPlainObject(drip.metadata) ? drip.metadata : {};
        const user = drip.user;
        await this.sendStep(drip.userId, drip.chainType, drip.step, {
          ...toTemplateContext(metadata),
          userName: user.firstName ?? undefined,
          lang: parseAppLocale(user.preferredLanguage),
        });

        // Переход к следующему шагу
        const nextStep = drip.step + 1;
        if (nextStep >= chain.length) {
          await this.prisma.emailDripStatus.update({
            where: { id: drip.id },
            data: { step: nextStep, status: 'COMPLETED', nextSendAt: null },
          });
        } else {
          const nextDelay = chain[nextStep].delayMs;
          const nextSendAt = new Date(Date.now() + nextDelay);
          await this.prisma.emailDripStatus.update({
            where: { id: drip.id },
            data: { step: nextStep, nextSendAt },
          });
        }
      } catch (err) {
        this.logger.error(
          `Failed to process drip ${drip.id} (chain=${drip.chainType}, step=${drip.step}): ${err}`,
        );
      }
    }
  }

  /**
   * Cancel a drip chain for a user
   */
  async cancelChain(userId: string, chainType: string) {
    await this.prisma.emailDripStatus.updateMany({
      where: { userId, chainType, status: 'ACTIVE' },
      data: { status: 'CANCELLED', nextSendAt: null },
    });
  }

  /**
   * Send a specific step of a chain
   */
  private async sendStep(
    userId: string,
    chainType: string,
    stepIndex: number,
    context: TemplateContext,
  ) {
    const chain = CHAINS[chainType];
    if (!chain || stepIndex >= chain.length) return;

    const step = chain[stepIndex];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, preferredLanguage: true },
    });

    if (!user?.email) {
      this.logger.warn(`No email for user ${userId}, skipping drip`);
      return;
    }

    const ctx: TemplateContext = {
      ...context,
      userName: user.firstName ?? undefined,
      lang: parseAppLocale(user.preferredLanguage),
    };

    const rendered = await this.templateService.render(step.template, ctx);

    await this.emailService.sendEmail(
      user.email,
      rendered.subject,
      rendered.html,
      rendered.text,
    );

    this.logger.log(
      `Sent drip: chain=${chainType}, step=${stepIndex}, template=${step.template}, to=${user.email}`,
    );
  }
}
