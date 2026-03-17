import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class LeadsConversationService {
  private readonly logger = new Logger(LeadsConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт беседу (чат) для лида при его создании.
   */
  async createForLead(lead: {
    id: string;
    masterId: string;
    clientId: string | null;
    clientPhone: string;
  }) {
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
      this.logger.error(
        `Failed to auto-create conversation for lead: ${lead.id}`,
        error,
      );
    }
  }
}
