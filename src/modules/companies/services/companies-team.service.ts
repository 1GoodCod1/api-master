import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyMemberStatus, CompanyRole, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  COMPANY_INVITATION_INCLUDE,
  COMPANY_MEMBER_INCLUDE,
} from '../companies-team.constants';
import type {
  CompanyInvitationPayload,
  CompanyMemberPayload,
  CompanyTeamOverview,
} from '../companies.types';
import {
  InviteCompanyMemberDto,
  UpdateCompanyMemberDto,
} from '../dto/company-team.dto';
import type { ActiveCompanyMembership } from './companies-access.service';
import { CompaniesAccessService } from './companies-access.service';
import { CompanyContextService } from '../../../common/company-context/company-context.service';

const INVITE_TTL_DAYS = 14;

@Injectable()
export class CompaniesTeamService {
  private readonly logger = new Logger(CompaniesTeamService.name);

  constructor(
    private readonly access: CompaniesAccessService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly companyContext: CompanyContextService,
  ) {}

  getTeamOverview(user: JwtUser): Promise<CompanyTeamOverview | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        const [members, invitations] = await Promise.all([
          tx.companyMember.findMany({
            where: { companyId: company.id, leftAt: null },
            include: COMPANY_MEMBER_INCLUDE,
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          }),
          this.canManageTeam(membership)
            ? tx.companyInvitation.findMany({
                where: {
                  companyId: company.id,
                  acceptedAt: null,
                  revokedAt: null,
                  expiresAt: { gt: new Date() },
                },
                include: COMPANY_INVITATION_INCLUDE,
                orderBy: { createdAt: 'desc' },
              })
            : Promise.resolve([]),
        ]);

        return {
          companyId: company.id,
          canManageTeam: this.canManageTeam(membership),
          canInviteManager: membership.role === CompanyRole.OWNER,
          canLinkMaster: membership.status === CompanyMemberStatus.ACTIVE,
          members,
          invitations,
        };
      },
    );
  }

  listMyPendingInvitations(user: JwtUser): Promise<CompanyInvitationPayload[]> {
    return this.prismaWithUser(user, async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      const email = dbUser?.email ?? user.email;
      if (!email) {
        return [];
      }

      return tx.companyInvitation.findMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: COMPANY_INVITATION_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  inviteMember(
    user: JwtUser,
    dto: InviteCompanyMemberDto,
  ): Promise<CompanyInvitationPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCanManageTeam(membership);
        this.assertCanAssignRole(membership, dto.role);

        const email = dto.email.trim().toLowerCase();
        const actorEmail = user.email?.toLowerCase();
        if (actorEmail && email === actorEmail) {
          throw AppErrors.badRequest('You cannot invite yourself');
        }

        const existingMember = await tx.companyMember.findFirst({
          where: {
            companyId: company.id,
            leftAt: null,
            user: { email: { equals: email, mode: 'insensitive' } },
          },
        });
        if (existingMember) {
          throw AppErrors.conflict('This user is already a company member');
        }

        const existingUser = await tx.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true },
        });

        if (existingUser) {
          const otherMembership = await tx.companyMember.findFirst({
            where: {
              userId: existingUser.id,
              leftAt: null,
              status: CompanyMemberStatus.ACTIVE,
            },
          });
          if (otherMembership && otherMembership.companyId !== company.id) {
            throw AppErrors.conflict(
              'This user already belongs to another company',
            );
          }
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(
          Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
        );

        const invitation = await tx.companyInvitation.upsert({
          where: {
            companyId_email: {
              companyId: company.id,
              email,
            },
          },
          create: {
            companyId: company.id,
            email,
            role: dto.role,
            invitedByUserId: user.id,
            token,
            expiresAt,
          },
          update: {
            role: dto.role,
            invitedByUserId: user.id,
            token,
            expiresAt,
            acceptedAt: null,
            revokedAt: null,
          },
          include: COMPANY_INVITATION_INCLUDE,
        });

        await this.sendInvitationEmail(invitation.email, company.name, token);
        return invitation;
      },
    );
  }

  revokeInvitation(user: JwtUser, invitationId: string) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCanManageTeam(membership);

        const invitation = await tx.companyInvitation.findFirst({
          where: {
            id: invitationId,
            companyId: company.id,
            acceptedAt: null,
            revokedAt: null,
          },
        });
        if (!invitation) {
          throw AppErrors.notFound('Invitation not found');
        }

        await tx.companyInvitation.update({
          where: { id: invitationId },
          data: { revokedAt: new Date() },
        });

        return { success: true };
      },
    );
  }

  acceptInvitation(
    user: JwtUser,
    invitationId: string,
  ): Promise<CompanyMemberPayload | null> {
    return this.prismaWithUser(user, async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      const email = dbUser?.email ?? user.email;
      if (!email) {
        throw AppErrors.badRequest(
          'User email is required to accept an invitation',
        );
      }

      const invitation = await tx.companyInvitation.findFirst({
        where: {
          id: invitationId,
          email: { equals: email, mode: 'insensitive' },
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!invitation) {
        throw AppErrors.notFound('Invitation not found or expired');
      }

      return this.acceptInvitationRecord(tx, user, invitation);
    }).then(async (member) => {
      if (member) {
        await this.companyContext.invalidateUserCompanyCache(user.id);
      }
      return member;
    });
  }

  acceptInvitationByToken(
    user: JwtUser,
    token: string,
  ): Promise<CompanyMemberPayload | null> {
    return this.prismaWithUser(user, async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      const email = dbUser?.email ?? user.email;
      if (!email) {
        throw AppErrors.badRequest(
          'User email is required to accept an invitation',
        );
      }

      const invitation = await tx.companyInvitation.findFirst({
        where: {
          token,
          email: { equals: email, mode: 'insensitive' },
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!invitation) {
        throw AppErrors.notFound('Invitation not found or expired');
      }

      return this.acceptInvitationRecord(tx, user, invitation);
    }).then(async (member) => {
      if (member) {
        await this.companyContext.invalidateUserCompanyCache(user.id);
      }
      return member;
    });
  }

  updateMember(
    user: JwtUser,
    memberId: string,
    dto: UpdateCompanyMemberDto,
  ): Promise<CompanyMemberPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCanManageTeam(membership);

        const target = await tx.companyMember.findFirst({
          where: { id: memberId, companyId: company.id, leftAt: null },
          include: COMPANY_MEMBER_INCLUDE,
        });
        if (!target) {
          throw AppErrors.notFound('Company member not found');
        }

        if (target.role === CompanyRole.OWNER) {
          throw AppErrors.forbidden('Owner role cannot be changed');
        }

        if (
          membership.role === CompanyRole.MANAGER &&
          (target.role !== CompanyRole.MEMBER ||
            (dto.role && dto.role !== CompanyRole.MEMBER))
        ) {
          throw AppErrors.forbidden('Managers can only manage member roles');
        }

        if (dto.role) {
          this.assertCanAssignRole(membership, dto.role);
        }

        return tx.companyMember.update({
          where: { id: memberId },
          data: { role: dto.role },
          include: COMPANY_MEMBER_INCLUDE,
        });
      },
    );
  }

  suspendMember(user: JwtUser, memberId: string) {
    return this.updateMemberStatus(
      user,
      memberId,
      CompanyMemberStatus.SUSPENDED,
    );
  }

  reactivateMember(user: JwtUser, memberId: string) {
    return this.updateMemberStatus(user, memberId, CompanyMemberStatus.ACTIVE);
  }

  removeMember(user: JwtUser, memberId: string) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCanManageTeam(membership);

        const target = await tx.companyMember.findFirst({
          where: { id: memberId, companyId: company.id, leftAt: null },
        });
        if (!target) {
          throw AppErrors.notFound('Company member not found');
        }

        if (target.role === CompanyRole.OWNER) {
          throw AppErrors.forbidden('Owner cannot be removed');
        }

        if (
          membership.role === CompanyRole.MANAGER &&
          target.role !== CompanyRole.MEMBER
        ) {
          throw AppErrors.forbidden('Managers can only remove members');
        }

        await tx.companyMember.update({
          where: { id: memberId },
          data: {
            leftAt: new Date(),
            masterId: null,
            status: CompanyMemberStatus.SUSPENDED,
          },
        });

        await this.syncTeamSize(tx, company.id);
        return { success: true };
      },
    );
  }

  linkMyMaster(user: JwtUser): Promise<CompanyMemberPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership }) => {
        if (membership.status !== CompanyMemberStatus.ACTIVE) {
          throw AppErrors.forbidden('Inactive company membership');
        }

        const master = await tx.master.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!master) {
          throw AppErrors.badRequest('Master profile not found');
        }

        const existingLink = await tx.companyMember.findFirst({
          where: {
            masterId: master.id,
            leftAt: null,
            NOT: { id: membership.id },
          },
        });
        if (existingLink) {
          throw AppErrors.conflict(
            'This master profile is already linked to another company',
          );
        }

        return tx.companyMember.update({
          where: { id: membership.id },
          data: { masterId: master.id },
          include: COMPANY_MEMBER_INCLUDE,
        });
      },
    );
  }

  unlinkMyMaster(user: JwtUser): Promise<CompanyMemberPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership }) => {
        return tx.companyMember.update({
          where: { id: membership.id },
          data: { masterId: null },
          include: COMPANY_MEMBER_INCLUDE,
        });
      },
    );
  }

  private updateMemberStatus(
    user: JwtUser,
    memberId: string,
    status: CompanyMemberStatus,
  ): Promise<CompanyMemberPayload | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCanManageTeam(membership);

        const target = await tx.companyMember.findFirst({
          where: { id: memberId, companyId: company.id, leftAt: null },
        });
        if (!target) {
          throw AppErrors.notFound('Company member not found');
        }

        if (target.role === CompanyRole.OWNER) {
          throw AppErrors.forbidden('Owner status cannot be changed');
        }

        if (
          membership.role === CompanyRole.MANAGER &&
          target.role !== CompanyRole.MEMBER
        ) {
          throw AppErrors.forbidden('Managers can only manage members');
        }

        return tx.companyMember.update({
          where: { id: memberId },
          data: { status },
          include: COMPANY_MEMBER_INCLUDE,
        });
      },
    );
  }

  private async acceptInvitationRecord(
    tx: Prisma.TransactionClient,
    user: JwtUser,
    invitation: {
      id: string;
      companyId: string;
      role: CompanyRole;
      email: string;
    },
  ): Promise<CompanyMemberPayload> {
    const existingMembership = await tx.companyMember.findFirst({
      where: {
        userId: user.id,
        leftAt: null,
        status: CompanyMemberStatus.ACTIVE,
      },
    });
    if (
      existingMembership &&
      existingMembership.companyId !== invitation.companyId
    ) {
      throw AppErrors.conflict('You already belong to another company');
    }

    await tx.$executeRaw`
      SELECT set_config('app.current_company_id', ${invitation.companyId}, true)
    `;

    const master = await tx.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (master) {
      const masterLinked = await tx.companyMember.findFirst({
        where: { masterId: master.id, leftAt: null },
      });
      if (masterLinked && masterLinked.companyId !== invitation.companyId) {
        throw AppErrors.conflict(
          'Your master profile is already linked to another company',
        );
      }
    }

    const member = await tx.companyMember.upsert({
      where: {
        companyId_userId: {
          companyId: invitation.companyId,
          userId: user.id,
        },
      },
      create: {
        companyId: invitation.companyId,
        userId: user.id,
        masterId: master?.id,
        role: invitation.role,
        status: CompanyMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      update: {
        role: invitation.role,
        status: CompanyMemberStatus.ACTIVE,
        leftAt: null,
        masterId: master?.id ?? null,
        joinedAt: new Date(),
      },
      include: COMPANY_MEMBER_INCLUDE,
    });

    await tx.companyInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await this.syncTeamSize(tx, invitation.companyId);
    return member;
  }

  private canManageTeam(membership: ActiveCompanyMembership): boolean {
    return (
      membership.role === CompanyRole.OWNER ||
      membership.role === CompanyRole.MANAGER
    );
  }

  private assertCanAssignRole(
    membership: ActiveCompanyMembership,
    role: CompanyRole,
  ): void {
    if (role === CompanyRole.OWNER) {
      throw AppErrors.forbidden('Owner role cannot be assigned via invitation');
    }

    if (
      membership.role === CompanyRole.MANAGER &&
      role !== CompanyRole.MEMBER
    ) {
      throw AppErrors.forbidden('Managers can only assign the member role');
    }
  }

  private async syncTeamSize(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<void> {
    const teamSize = await tx.companyMember.count({
      where: {
        companyId,
        leftAt: null,
        status: {
          in: [CompanyMemberStatus.ACTIVE, CompanyMemberStatus.INVITED],
        },
      },
    });

    await tx.company.update({
      where: { id: companyId },
      data: { teamSize },
    });
  }

  private prismaWithUser<T>(
    user: JwtUser,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.withRlsContext(
      { currentUserId: user.id, userRole: user.role },
      work,
    );
  }

  private async sendInvitationEmail(
    email: string,
    companyName: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontendUrl', '');
    const acceptUrl = frontendUrl
      ? `${frontendUrl}/company/team?invite=${token}`
      : null;

    const html = `
      <p>You have been invited to join <strong>${companyName}</strong> on Faber.</p>
      ${
        acceptUrl
          ? `<p><a href="${acceptUrl}">Accept invitation</a></p>`
          : '<p>Sign in to Faber and open your company team page to accept the invitation.</p>'
      }
    `;

    try {
      await this.emailService.sendEmail(
        email,
        `Invitation to join ${companyName}`,
        html,
        `You have been invited to join ${companyName} on Faber.`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send company invitation email to ${email}`,
        error,
      );
    }
  }
}
