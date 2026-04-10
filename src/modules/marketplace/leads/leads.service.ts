import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { UserRole } from '@prisma/client';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { generateShortId } from '../../shared/utils/generate-id';
import { LeadsValidationService } from './services/leads-validation.service';
import { LeadsClientDataService } from './services/leads-client-data.service';
import { LeadsSpamService } from './services/leads-spam.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { LeadsCreateNotificationService } from './services/leads-create-notification.service';
import { LeadsConversationService } from './services/leads-conversation.service';
import { MastersAvailabilityService } from '../masters/services/masters-availability.service';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: LeadsValidationService,
    private readonly clientDataService: LeadsClientDataService,
    private readonly spamService: LeadsSpamService,
    private readonly analyticsService: LeadsAnalyticsService,
    private readonly createNotificationService: LeadsCreateNotificationService,
    private readonly conversationService: LeadsConversationService,
    private readonly availabilityService: MastersAvailabilityService,
  ) {}

  async create(
    createLeadDto: CreateLeadDto,
    authUser?: JwtUser,
    ipAddress?: string,
  ) {
    const { masterId, clientPhone, clientName, message, fileIds } =
      createLeadDto;

    const clientId: string | null =
      authUser?.id && authUser?.role === UserRole.CLIENT ? authUser.id : null;

    const { resolvedClientName, resolvedClientPhone } =
      await this.clientDataService.resolveClientData(
        clientId,
        clientName,
        clientPhone,
      );

    if (!resolvedClientPhone) {
      throw AppErrors.badRequest(AppErrorMessages.LEAD_CLIENT_PHONE_MISSING);
    }

    createLeadDto.clientPhone = resolvedClientPhone;
    createLeadDto.clientName = resolvedClientName ?? undefined;

    const master = await this.validationService.validateCreate(
      masterId,
      authUser,
      fileIds,
    );

    await this.spamService.checkProtection(createLeadDto, ipAddress);
    const spamScore = this.spamService.calculateSpamScore(createLeadDto);

    const lead = await this.prisma.lead.create({
      data: {
        id: generateShortId(),
        masterId,
        clientPhone: resolvedClientPhone,
        clientName: resolvedClientName,
        clientId,
        message,
        spamScore,
        isPremium: false,
        files: fileIds?.length
          ? {
              createMany: {
                data: fileIds.map((id) => ({ fileId: id })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: {
        files: { include: { file: true } },
      },
    });

    await this.availabilityService.incrementActiveLeads(masterId);
    await this.analyticsService.handlePostCreation(masterId);

    await this.conversationService.createForLead(lead);

    await this.createNotificationService.sendLeadNotifications({
      lead,
      master,
      clientId,
      resolvedClientName,
      resolvedClientPhone,
      message,
    });

    return lead;
  }
}
