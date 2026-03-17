import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
interface MasterLeadsFields {
  id: string;
  leadsResetAt: Date | null;
  leadsReceivedToday: number;
}

@Injectable()
export class LeadsValidationService {
  private readonly logger = new Logger(LeadsValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        throw new NotFoundException('Master not found');
      }

      if (!(master.user as { isVerified?: boolean })?.isVerified) {
        throw new ForbiddenException(
          'This master has not verified their profile yet. Leads are not accepted until verification.',
        );
      }

      if (authUser?.id && master.userId === authUser.id) {
        throw new BadRequestException('You cannot send a lead to yourself');
      }

      // Ролевая проверка — только авторизованные клиенты
      if (!authUser || authUser.role !== 'CLIENT') {
        throw new ForbiddenException(
          'Only authorized clients can create leads. Please register or log in.',
        );
      }

      // Проверка верификации телефона
      if (authUser?.role === 'CLIENT' && !authUser.phoneVerified) {
        throw new ForbiddenException(
          'Phone verification required to create leads. Please verify your phone number first.',
        );
      }

      // Проверка статуса доступности мастера
      if (
        master.availabilityStatus === 'BUSY' ||
        master.availabilityStatus === 'OFFLINE'
      ) {
        throw new BadRequestException(
          'Master is currently unavailable and cannot accept new leads. Please try again later or subscribe to notifications.',
        );
      }

      // Проверка лимита активных лидов
      if (master.currentActiveLeads >= master.maxActiveLeads) {
        throw new BadRequestException(
          `Master has reached the maximum number of active leads (${master.maxActiveLeads}). Please wait or subscribe to get notified when available.`,
        );
      }

      // Сброс счетчика лидов за день если нужно
      await this.resetDailyLeadsCounterIfNeeded(master);

      // Проверка лимита лидов за день
      if (
        master.maxLeadsPerDay !== null &&
        master.leadsReceivedToday >= master.maxLeadsPerDay
      ) {
        throw new BadRequestException(
          `Master has reached the daily limit of ${master.maxLeadsPerDay} leads. Please try again tomorrow.`,
        );
      }

      // Проверка на существующую открытую заявку от этого клиента к этому мастеру
      const clientId = authUser?.role === 'CLIENT' ? authUser.id : null;
      if (clientId) {
        const existingOpenLead = await this.prisma.lead.findFirst({
          where: {
            clientId,
            masterId,
            status: { in: ['NEW', 'IN_PROGRESS'] },
          },
        });
        if (existingOpenLead) {
          throw new BadRequestException(
            'У вас уже есть активная заявка к этому мастеру. Дождитесь её завершения перед отправкой новой.',
          );
        }
      }

      // Валидация файлов
      if (fileIds?.length) {
        if (fileIds.length > 10) {
          throw new BadRequestException('Maximum 10 files allowed');
        }

        const files = await this.prisma.file.findMany({
          where: { id: { in: fileIds } },
        });
        if (files.length !== fileIds.length) {
          throw new BadRequestException('Some files were not found');
        }

        // IDOR: проверка принадлежности файлов
        const allowedUploadedById = authUser?.id ?? null;
        const notOwned = files.find(
          (f) => f.uploadedById !== allowedUploadedById,
        );
        if (notOwned) {
          throw new BadRequestException(
            'Some files do not belong to you and cannot be attached to the lead',
          );
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
