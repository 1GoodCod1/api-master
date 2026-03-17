import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class LeadsAvailabilitySubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(clientId: string, masterId: string) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { id: true, availabilityStatus: true },
    });

    if (!master) {
      throw new BadRequestException('Master not found');
    }

    const subscription =
      await this.prisma.masterAvailabilitySubscription.upsert({
        where: {
          clientId_masterId: { clientId, masterId },
        },
        create: { clientId, masterId },
        update: { notifiedAt: null },
      });

    return {
      success: true,
      message: 'You will be notified when this master becomes available',
      subscription,
    };
  }

  async unsubscribe(clientId: string, masterId: string) {
    await this.prisma.masterAvailabilitySubscription.deleteMany({
      where: { clientId, masterId },
    });

    return {
      success: true,
      message: 'Unsubscribed from notifications',
    };
  }
}
