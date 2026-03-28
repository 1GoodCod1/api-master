import { Injectable } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { UserRole } from '@prisma/client';
import { ACTIVE_BOOKING_STATUSES } from '../../../../common/constants';
import { FINAL_LEAD_STATUSES } from '../../../../common/constants';
import { CreateBookingDto } from '../dto/create-booking.dto';
import type { BookingsAuthUser, ResolvedClientData } from '../types';

export type { ResolvedClientData };

@Injectable()
export class BookingsValidationService {
  constructor(private readonly prisma: PrismaService) {}

  validateCreateAuth(authUser: BookingsAuthUser): void {
    if (!authUser) {
      throw AppErrors.forbidden(AppErrorMessages.BOOKING_AUTH_REQUIRED);
    }
    if (
      authUser.role !== UserRole.CLIENT &&
      authUser.role !== UserRole.MASTER
    ) {
      throw AppErrors.forbidden(AppErrorMessages.BOOKING_ONLY_CLIENT_OR_MASTER);
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
        throw AppErrors.badRequest(AppErrorMessages.BOOKING_MASTER_NEEDS_LEAD);
      }
      const masterProfileId = authUser.masterProfile?.id;
      if (!masterProfileId || masterProfileId !== masterId) {
        throw AppErrors.forbidden(AppErrorMessages.BOOKING_OWN_PROFILE_ONLY);
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
        throw AppErrors.badRequest(AppErrorMessages.BOOKING_LEAD_WRONG_MASTER);
      }
      if (FINAL_LEAD_STATUSES.includes(lead.status)) {
        throw AppErrors.badRequest(
          AppErrorTemplates.createBookingFromFinalLead(lead.status),
        );
      }
      resolvedPhone = lead.clientPhone;
      resolvedName = lead.clientName ?? undefined;
      resolvedClientId = lead.clientId;
    } else {
      if (authUser.phoneVerified === false) {
        throw AppErrors.forbidden(AppErrorMessages.BOOKING_PHONE_VERIFY);
      }
      resolvedClientId = authUser.id;
      if (leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, masterId: true, clientId: true, status: true },
        });
        if (lead?.masterId !== masterId) {
          throw AppErrors.badRequest(
            AppErrorMessages.BOOKING_LEAD_WRONG_MASTER,
          );
        }
        if (FINAL_LEAD_STATUSES.includes(lead.status)) {
          throw AppErrors.badRequest(
            AppErrorTemplates.createBookingFromFinalLead(lead.status),
          );
        }
        if (lead.clientId !== authUser.id) {
          throw AppErrors.forbidden(AppErrorMessages.BOOKING_OWN_LEAD_ONLY);
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
      throw AppErrors.badRequest(
        AppErrorMessages.BOOKING_SLOT_START_BEFORE_END,
      );
    }
    if (start < new Date()) {
      throw AppErrors.badRequest(AppErrorMessages.BOOKING_SLOT_PAST);
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
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflicting) {
      throw AppErrors.badRequest(AppErrorMessages.BOOKING_SLOT_TAKEN);
    }
  }
}
