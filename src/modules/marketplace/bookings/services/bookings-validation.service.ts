import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateBookingDto } from '../dto/create-booking.dto';
import type { BookingsAuthUser } from '../types/bookings-auth-user.types';

export type ResolvedClientData = {
  resolvedPhone: string;
  resolvedName: string | undefined;
  resolvedClientId: string | null;
  resolvedLeadId: string | null;
};

@Injectable()
export class BookingsValidationService {
  constructor(private readonly prisma: PrismaService) {}

  validateCreateAuth(authUser: BookingsAuthUser): void {
    if (!authUser) {
      throw new ForbiddenException(
        'Only authorized users can create bookings. Please log in.',
      );
    }
    if (
      authUser.role !== UserRole.CLIENT &&
      authUser.role !== UserRole.MASTER
    ) {
      throw new ForbiddenException(
        'Only clients or masters can create bookings.',
      );
    }
  }

  async resolveClientData(
    dto: CreateBookingDto,
    clientPhone: string,
    clientName: string | undefined,
    authUser: BookingsAuthUser,
  ): Promise<ResolvedClientData> {
    const { masterId, leadId } = dto;
    let resolvedPhone = clientPhone;
    let resolvedName = clientName;
    let resolvedClientId: string | null;
    const resolvedLeadId: string | null = leadId ?? null;

    if (authUser.role === UserRole.MASTER) {
      if (!leadId) {
        throw new BadRequestException(
          'Master can only create bookings from a lead (leadId required).',
        );
      }
      const masterProfileId = authUser.masterProfile?.id;
      if (!masterProfileId || masterProfileId !== masterId) {
        throw new ForbiddenException(
          'You can only create bookings for your own profile.',
        );
      }
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          masterId: true,
          status: true,
          clientPhone: true,
          clientName: true,
          clientId: true,
        },
      });
      if (lead?.masterId !== masterId) {
        throw new BadRequestException(
          'Lead not found or does not belong to this master.',
        );
      }
      if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
        throw new BadRequestException(
          `Cannot create booking from a ${lead.status} lead.`,
        );
      }
      resolvedPhone = lead.clientPhone;
      resolvedName = lead.clientName ?? undefined;
      resolvedClientId = lead.clientId;
    } else {
      if (authUser.phoneVerified === false) {
        throw new ForbiddenException(
          'Phone verification required to create bookings. Please verify your phone number first.',
        );
      }
      resolvedClientId = authUser.id;
      if (leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, masterId: true, clientId: true, status: true },
        });
        if (lead?.masterId !== masterId) {
          throw new BadRequestException(
            'Lead not found or does not belong to this master.',
          );
        }
        if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
          throw new BadRequestException(
            `Cannot create booking from a ${lead.status} lead.`,
          );
        }
        if (lead.clientId !== authUser.id) {
          throw new ForbiddenException(
            'You can only create a booking for your own lead.',
          );
        }
      }
    }

    return {
      resolvedPhone,
      resolvedName,
      resolvedClientId,
      resolvedLeadId,
    };
  }

  validateTimeSlot(start: Date, end: Date): void {
    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }
    if (start < new Date()) {
      throw new BadRequestException('Start time cannot be in the past');
    }
  }

  async ensureNoConflict(
    masterId: string,
    start: Date,
    end: Date,
  ): Promise<void> {
    const conflicting = await this.prisma.booking.findFirst({
      where: {
        masterId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflicting) {
      throw new BadRequestException('This time slot is already booked');
    }
  }
}
