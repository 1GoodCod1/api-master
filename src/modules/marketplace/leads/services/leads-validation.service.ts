import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import type { MasterLeadsFields } from '../types';
import {
  LEAD_REPOSITORY,
  type ILeadRepository,
} from '../repositories/lead.repository';

@Injectable()
export class LeadsValidationService {
  private readonly logger = new Logger(LeadsValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepo: ILeadRepository,
  ) {}

  /**
   * Сброс счетчика лидов за день если прошло больше суток
   */
  private async resetDailyLeadsCounterIfNeeded(
    master: MasterLeadsFields & { leadsResetAt?: Date | null },
  ) {
    const now = new Date();
    const lastResetRaw = master.leadsResetAt;
    const lastReset = lastResetRaw
      ? new Date(lastResetRaw as string | number | Date)
      : null;

    if (
      !lastReset ||
      now.getTime() - lastReset.getTime() >= 24 * 60 * 60 * 1000
    ) {
      await this.prisma.master.update({
        where: { id: master.id },
        data: {
          leadsReceivedToday: 0,
          leadsResetAt: now,
        },
      });
      (master as { leadsReceivedToday: number }).leadsReceivedToday = 0;
      (master as { leadsResetAt: Date }).leadsResetAt = now;
    }
  }

  /**
   * Полная валидация перед созданием лида
   */
  async validateCreate(
    masterId: string,
    authUser?: JwtUser | null,
    fileIds?: string[],
  ) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        include: { user: true },
      });

      if (!master) {
        throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
      }

      if (!(master.user as { isVerified?: boolean })?.isVerified) {
        throw AppErrors.forbidden(AppErrorMessages.LEAD_MASTER_NOT_VERIFIED);
      }

      if (authUser?.id && master.userId === authUser.id) {
        throw AppErrors.badRequest(AppErrorMessages.LEAD_CANNOT_SEND_TO_SELF);
      }

      // Ролевая проверка — только авторизованные клиенты
      if (authUser?.role !== UserRole.CLIENT) {
        throw AppErrors.forbidden(AppErrorMessages.LEAD_ONLY_CLIENTS);
      }

      // Проверка верификации телефона
      if (authUser?.role === UserRole.CLIENT && !authUser.phoneVerified) {
        throw AppErrors.forbidden(AppErrorMessages.LEAD_PHONE_VERIFY_CREATE);
      }

      // Проверка статуса доступности мастера
      if (
        master.availabilityStatus === 'BUSY' ||
        master.availabilityStatus === 'OFFLINE'
      ) {
        throw AppErrors.badRequest(AppErrorMessages.LEAD_MASTER_UNAVAILABLE);
      }

      // Проверка лимита активных лидов
      if (master.currentActiveLeads >= master.maxActiveLeads) {
        throw AppErrors.badRequest(
          AppErrorTemplates.leadMaxActive(master.maxActiveLeads),
        );
      }

      // Сброс счетчика лидов за день если нужно
      await this.resetDailyLeadsCounterIfNeeded(master);

      // Проверка лимита лидов за день
      if (
        master.maxLeadsPerDay !== null &&
        master.leadsReceivedToday >= master.maxLeadsPerDay
      ) {
        throw AppErrors.badRequest(
          AppErrorTemplates.leadDailyLimit(master.maxLeadsPerDay),
        );
      }

      // Проверка на существующую открытую заявку от этого клиента к этому мастеру
      const clientId = authUser?.role === UserRole.CLIENT ? authUser.id : null;
      if (clientId) {
        const existingOpenLead =
          await this.leadRepo.findActiveByClientAndMaster(clientId, masterId);
        if (existingOpenLead) {
          throw AppErrors.badRequest(
            AppErrorMessages.LEAD_ACTIVE_DUPLICATE_TO_MASTER,
          );
        }
      }

      // Валидация файлов
      if (fileIds?.length) {
        if (fileIds.length > 10) {
          throw AppErrors.badRequest(AppErrorMessages.FILES_MAX_10);
        }

        const files = await this.prisma.file.findMany({
          where: { id: { in: fileIds } },
        });
        if (files.length !== fileIds.length) {
          throw AppErrors.badRequest(AppErrorMessages.FILES_SOME_NOT_FOUND);
        }

        // IDOR: проверка принадлежности файлов
        const allowedUploadedById = authUser?.id ?? null;
        const notOwned = files.find(
          (f) => f.uploadedById !== allowedUploadedById,
        );
        if (notOwned) {
          throw AppErrors.badRequest(AppErrorMessages.LEAD_FILES_NOT_OWNED);
        }
      }

      return master;
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      this.logger.error('validateCreate failed', err);
      throw err;
    }
  }
}
