import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, LeadStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MastersAvailabilityService } from '../../masters/services/masters-availability.service';

@Injectable()
export class BookingsLeadSyncService {
  private readonly logger = new Logger(BookingsLeadSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: MastersAvailabilityService,
  ) {}

  async updateLeadStatusOnCreate(leadId: string | null): Promise<void> {
    if (!leadId) return;
    try {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.IN_PROGRESS, updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update lead status after booking creation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateLeadOnStatusChange(
    booking: { leadId: string | null; masterId: string },
    newStatus: BookingStatus,
  ): Promise<void> {
    if (!booking.leadId) return;

    try {
      if (newStatus === BookingStatus.CONFIRMED) {
        await this.updateLeadStatusOnCreate(booking.leadId);
        return;
      }

      if (newStatus === BookingStatus.CANCELLED) {
        await this.prisma.$transaction(async (tx) => {
          await tx.lead.update({
            where: { id: booking.leadId! },
            data: { status: LeadStatus.NEW, updatedAt: new Date() },
          });
          await this.availabilityService.decrementActiveLeads(booking.masterId);
        });
      } else if (newStatus === BookingStatus.COMPLETED) {
        await this.prisma.$transaction(async (tx) => {
          const lead = await tx.lead.findUnique({
            where: { id: booking.leadId! },
            select: { id: true, masterId: true, status: true },
          });

          if (lead && lead.status !== LeadStatus.CLOSED) {
            await tx.lead.update({
              where: { id: booking.leadId! },
              data: { status: LeadStatus.CLOSED, updatedAt: new Date() },
            });
            await this.availabilityService.decrementActiveLeads(lead.masterId);
          }
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update lead status after booking status change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
