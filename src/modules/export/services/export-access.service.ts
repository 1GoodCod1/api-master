import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { TariffType } from '../../../common/constants';
import { getEffectiveTariff } from '../../../common/helpers/plans';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

@Injectable()
export class ExportAccessService {
  private readonly logger = new Logger(ExportAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверка прав доступа и наличия тарифа PREMIUM
   */
  async validateExportAccess(masterId: string, user: JwtUser): Promise<void> {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        include: { user: true },
      });

      if (!master) {
        throw AppErrors.badRequest(AppErrorMessages.MASTER_NOT_FOUND);
      }

      if (user.role !== UserRole.ADMIN && master.userId !== user.id) {
        throw AppErrors.forbidden(AppErrorMessages.EXPORT_OWN_DATA_ONLY);
      }

      const effectiveTariff = getEffectiveTariff(master);
      if (effectiveTariff !== TariffType.PREMIUM) {
        throw AppErrors.forbidden(AppErrorMessages.EXPORT_PREMIUM_ONLY);
      }
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('validateExportAccess failed', err);
      throw err;
    }
  }
}
