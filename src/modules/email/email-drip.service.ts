import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import type { TemplateContext } from './templates';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function parseLang(s: string | null | undefined): 'en' | 'ru' | 'ro' {
  if (s === 'en' || s === 'ru' || s === 'ro') return s;
  return 'ro';
}

/** Copy only primitive values from metadata to avoid unsafe assignment from Prisma JsonValue */
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

/**
 * Drip chain definitions: [step] → { template, delayMs }
 */
interface ChainStep {
  template: string;
  delayMs: number; // delay from chain start in ms
}

const CHAINS: Record<string, ChainStep[]> = {
  // Temporarily disabled — no welcome drip emails
  welcome: [],
  // Temporarily disabled — no lead drip emails
  lead_created: [],
  // Temporarily disabled — no post-close review request email
  lead_closed: [],
  reengagement: [
    { template: 'reengagement', delayMs: 0 }, // immediately (triggered after 14d inactivity)
  ],
  // Temporarily disabled — no master onboarding drip emails
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
   * Start a new drip chain for a user
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

    // Check if chain already exists
    const existing = await this.prisma.emailDripStatus.findUnique({
      where: { userId_chainType: { userId, chainType } },
    });

    if (existing?.status === 'ACTIVE') {
      this.logger.debug(`Chain ${chainType} already active for user ${userId}`);
      return;
    }
    // Reengagement: don't restart if already completed (avoid daily spam)
    if (chainType === 'reengagement' && existing?.status === 'COMPLETED') {
      this.logger.debug(`Reengagement already sent for user ${userId}`);
      return;
    }

    // Send first step immediately if delay is 0
    const firstStep = chain[0];
    if (firstStep.delayMs === 0) {
      await this.sendStep(userId, chainType, 0, context);
    }

    // Calculate next send time
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
   * Process pending drip emails (called by CRON/scheduler)
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
      take: 50, // process in batches
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
        const user = drip.user as {
          firstName: string | null;
          preferredLanguage: string | null;
        } & Prisma.UserGetPayload<{ select: { email: true } }>;
        await this.sendStep(drip.userId, drip.chainType, drip.step, {
          ...toTemplateContext(metadata),
          userName: user.firstName ?? undefined,
          lang: parseLang(user.preferredLanguage),
        });

        // Advance to next step
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
      lang: parseLang(user.preferredLanguage),
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
