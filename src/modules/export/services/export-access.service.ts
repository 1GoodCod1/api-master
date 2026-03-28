import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
        throw new BadRequestException('Master not found');
      }

      if (user.role !== UserRole.ADMIN && master.userId !== user.id) {
        throw new ForbiddenException('You can only export your own data');
      }

      const effectiveTariff = getEffectiveTariff(master);
      if (effectiveTariff !== TariffType.PREMIUM) {
        throw new ForbiddenException(
          'Export is only available for PREMIUM tariff',
        );
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
