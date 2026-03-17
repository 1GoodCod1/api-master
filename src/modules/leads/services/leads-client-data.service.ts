import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { formatUserName } from '../../shared/utils/format-name.util';

@Injectable()
export class LeadsClientDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Разрешает имя и телефон клиента из профиля, если не переданы в запросе.
   */
  async resolveClientData(
    clientId: string | null,
    clientName?: string,
    clientPhone?: string,
  ): Promise<{
    resolvedClientName: string | null;
    resolvedClientPhone: string | null;
  }> {
    let resolvedClientName = clientName?.trim() || null;
    let resolvedClientPhone = clientPhone?.trim() || null;

    if (clientId) {
      const user = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { firstName: true, lastName: true, phone: true },
      });
      if (user) {
        if (!resolvedClientName) {
          const full = formatUserName(user.firstName, user.lastName);
          if (full) resolvedClientName = full;
        }
        if (!resolvedClientPhone && user.phone) {
          resolvedClientPhone = user.phone;
        }
      }
    }

    return { resolvedClientName, resolvedClientPhone };
  }
}
