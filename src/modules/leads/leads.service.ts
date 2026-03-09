import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentStatus } from '../../common/constants';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../shared/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsValidationService } from './services/leads-validation.service';
import { LeadsSpamService } from './services/leads-spam.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { LeadsQueryService } from './services/leads-query.service';
import { LeadsActionsService } from './services/leads-actions.service';
import { MastersAvailabilityService } from '../masters/services/masters-availability.service';
import { encodeId } from '../shared/utils/id-encoder';
import { EmailDripService } from '../email/email-drip.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly validationService: LeadsValidationService,
    private readonly spamService: LeadsSpamService,
    private readonly analyticsService: LeadsAnalyticsService,
    private readonly queryService: LeadsQueryService,
    private readonly actionsService: LeadsActionsService,
    private readonly availabilityService: MastersAvailabilityService,
    private readonly emailDripService: EmailDripService,
  ) {}

  /**
   * Главный метод создания лида (Координатор)
   */
  async create(
    createLeadDto: CreateLeadDto,
    authUser?: JwtUser,
    ipAddress?: string,
  ) {
    const {
      masterId,
      clientPhone,
      clientName,
      message,
      fileIds,
      paymentSessionId,
    } = createLeadDto;

    const clientId: string | null =
      authUser?.id && authUser?.role === 'CLIENT' ? authUser.id : null;

    let resolvedClientName = clientName?.trim() || null;
    let resolvedClientPhone = clientPhone?.trim() || null;

    // If client is authenticated, prefer data from their profile
    if (clientId) {
      const user = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { firstName: true, lastName: true, phone: true },
      });

      if (user) {
        if (!resolvedClientName) {
          const full = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (full) resolvedClientName = full;
        }
        if (!resolvedClientPhone && user.phone) {
          resolvedClientPhone = user.phone;
        }
      }
    }

    // If phone is still missing, we cannot create a lead
    if (!resolvedClientPhone) {
      throw new BadRequestException(
        'Client phone number is missing. Please add it in your profile.',
      );
    }

    // Propagate resolved values back to DTO for spam checks and downstream services
    createLeadDto.clientPhone = resolvedClientPhone;
    createLeadDto.clientName = resolvedClientName ?? undefined;

    // 1. Валидация (Мастер, Права, Файлы)
    const master = await this.validationService.validateCreate(
      masterId,
      authUser,
      fileIds,
    );

    // 2. Проверка премиум статуса
    const isPremium = await this.checkPremiumPayment(paymentSessionId);

    // 3. Защита от спама (только для обычных лидов)
    if (!isPremium) {
      await this.spamService.checkProtection(createLeadDto, ipAddress);
    }

    // 4. Определение clientId и расчет Spam Score
    const spamScore = isPremium
      ? 0
      : this.spamService.calculateSpamScore(createLeadDto);

    // 4.1. Проверка на существующую открытую заявку от этого клиента к этому мастеру
    if (clientId) {
      const existingOpenLead = await this.prisma.lead.findFirst({
        where: {
          clientId,
          masterId,
          status: { in: ['NEW', 'IN_PROGRESS'] },
        },
        select: { id: true, status: true, createdAt: true },
      });

      if (existingOpenLead) {
        throw new BadRequestException(
          'У вас уже есть активная заявка к этому мастеру. Дождитесь её завершения перед отправкой новой.',
        );
      }
    }

    // 5. Сохранение в базу данных
    const lead = await this.prisma.lead.create({
      data: {
        masterId,
        clientPhone: resolvedClientPhone,
        clientName: resolvedClientName,
        clientId,
        message,
        spamScore,
        isPremium,
        files: fileIds?.length
          ? {
              createMany: {
                data: fileIds.map((id) => ({ fileId: id })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: {
        files: { include: { file: true } },
      },
    });

    // 6. Увеличение счетчика лидов за день и активных лидов (Через централизованный сервис)
    await this.availabilityService.incrementActiveLeads(masterId);

    // 7. Пост-процессинг (Аналитика, Счётчики, Кеш)
    await this.analyticsService.handlePostCreation(masterId);

    // 8. Автоматическое создание беседы (чата) для лида
    try {
      await this.prisma.conversation.create({
        data: {
          leadId: lead.id,
          masterId: lead.masterId,
          clientId: lead.clientId,
          clientPhone: lead.clientPhone,
        },
      });
    } catch (error) {
      // Conversation creation is not critical
      this.logger.error(
        `Failed to auto-create conversation for lead: ${lead.id}`,
        error,
      );
    }

    // 9. Уведомление мастера (SMS всегда; Telegram/WhatsApp по leadNotifyChannel)
    const channel =
      (master as { leadNotifyChannel?: string }).leadNotifyChannel || 'both';
    const tg = master.telegramChatId as string | null | undefined;
    const wa = master.whatsappPhone as string | null | undefined;
    const notificationOptions: {
      telegramChatId?: string;
      whatsappPhone?: string;
    } = {};
    if (channel === 'telegram' && tg) notificationOptions.telegramChatId = tg;
    else if (channel === 'whatsapp' && wa)
      notificationOptions.whatsappPhone = wa;
    else if (channel === 'both') {
      if (tg) notificationOptions.telegramChatId = tg;
      if (wa) notificationOptions.whatsappPhone = wa;
    }
    await this.notificationsService.sendLeadNotification(
      master.user.phone,
      {
        leadId: lead.id,
        clientName: resolvedClientName || undefined,
        clientPhone: resolvedClientPhone,
        message,
        isPremium,
      },
      notificationOptions,
    );

    // 10. Уведомление клиенту: заявка отправлена (in-app: БД + WebSocket)
    if (clientId) {
      try {
        const masterName =
          [master.user.firstName, master.user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || 'мастеру';
        await this.inAppNotifications
          .notifyLeadSentToClient(clientId, { leadId: lead.id, masterName })
          .catch(() => {});
      } catch (err) {
        this.logger.error(
          'Failed to send lead-sent notification to client',
          err,
        );
      }

      this.emailDripService
        .startChain(clientId, 'lead_created')
        .catch((err) => {
          this.logger.error('Failed to start lead_created drip chain', err);
        });
    }

    // 11. In-app уведомление мастеру (сохраняется в БД + отправляется через WebSocket)
    try {
      await this.inAppNotifications.notifyNewLead(master.userId, {
        leadId: lead.id,
        clientName: resolvedClientName || undefined,
        clientPhone: resolvedClientPhone,
        masterId,
      });
    } catch (err) {
      this.logger.error('Failed to save in-app notification for lead', err);
    }

    return { ...lead, encodedId: encodeId(lead.id) };
  }

  /**
   * Проверка платежа за премиум-выделение лида
   *
   * TODO: After Stripe removal, stripeSession field is repurposed for MIA order IDs.
   * This query currently uses stripeSession to find the payment by MIA order ID.
   * For a clean fix: run migration to rename stripeSession -> miaOrderId in schema,
   * and update all create/query references accordingly.
   */
  private async checkPremiumPayment(sessionId?: string): Promise<boolean> {
    if (!sessionId) return false;

    const payment = await this.prisma.payment.findFirst({
      where: {
        status: PaymentStatus.SUCCESS,
        metadata: {
          path: ['paymentType'],
          equals: 'PREMIUM_LEAD',
        },
      },
    });

    if (!payment) {
      throw new BadRequestException(
        'Premium payment not found or not completed',
      );
    }

    return true;
  }

  // ==================== ДЕЛЕГИРОВАНИЕ (ПОИСК И ОБНОВЛЕНИЕ) ====================

  async findAll(
    authUser: JwtUser,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ) {
    return this.queryService.findAll(authUser, options);
  }

  async findOne(idOrEncoded: string, authUser: JwtUser) {
    return this.queryService.findOne(idOrEncoded, authUser);
  }

  async updateStatus(
    leadId: string,
    authUser: JwtUser,
    updateDto: UpdateLeadStatusDto,
  ) {
    const updated = await this.actionsService.updateStatus(
      leadId,
      authUser,
      updateDto,
    );
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: updated.masterId },
        select: { userId: true },
      });
      if (master) {
        await this.inAppNotifications.notifyLeadStatusUpdated(master.userId, {
          leadId: updated.id,
          status: updated.status,
          clientName: updated.clientName ?? undefined,
        });
      }
    } catch (err) {
      console.error('Failed to send lead status notification:', err);
    }
    return updated;
  }

  async getStats(authUser: JwtUser) {
    return this.queryService.getStats(authUser);
  }

  async subscribeToAvailability(clientId: string, masterId: string) {
    // Проверяем существование мастера
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { id: true, availabilityStatus: true },
    });

    if (!master) {
      throw new BadRequestException('Master not found');
    }

    // Создаём или обновляем подписку
    const subscription =
      await this.prisma.masterAvailabilitySubscription.upsert({
        where: {
          clientId_masterId: {
            clientId,
            masterId,
          },
        },
        create: {
          clientId,
          masterId,
        },
        update: {
          notifiedAt: null, // Сбрасываем если уже были уведомления
        },
      });

    return {
      success: true,
      message: 'You will be notified when this master becomes available',
      subscription,
    };
  }

  async unsubscribeFromAvailability(clientId: string, masterId: string) {
    await this.prisma.masterAvailabilitySubscription.deleteMany({
      where: {
        clientId,
        masterId,
      },
    });

    return {
      success: true,
      message: 'Unsubscribed from notifications',
    };
  }

  /**
   * Проверка наличия активной заявки от клиента к мастеру
   */
  async getActiveLeadToMaster(clientId: string, masterId: string) {
    const activeLead = await this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
        conversation: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activeLead;
  }
}
