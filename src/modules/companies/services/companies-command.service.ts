import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  CompanyMemberStatus,
  CompanyMode,
  CompanyRole,
  Prisma,
} from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { generateSlug } from '../../shared/utils/slug';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { COMPANY_INCLUDE_BASE } from '../companies.constants';
import { CompanyContextService } from '../../../common/company-context/company-context.service';
import { CompaniesSubscriptionService } from './companies-subscription.service';

@Injectable()
export class CompaniesCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: CompaniesSubscriptionService,
    private readonly companyContext: CompanyContextService,
  ) {}

  async createCompany(dto: CreateCompanyDto, user: JwtUser) {
    try {
      return await this.prisma.withRlsContext(
        { currentUserId: user.id, userRole: user.role },
        async (tx) => {
          const master = await tx.master.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });
          const cityId = await this.resolveCityId(tx, dto.cityId);
          const categoryId = dto.categoryId
            ? await this.resolveCategoryId(tx, dto.categoryId)
            : undefined;

          const company = await tx.company.create({
            data: {
              slug: this.createInitialSlug(dto.name),
              ownerUserId: user.id,
              name: dto.name,
              legalName: dto.legalName,
              idno: dto.idno,
              legalAddress: dto.legalAddress,
              mode: dto.mode ?? CompanyMode.PROVIDER,
              isTvaPayer: dto.isTvaPayer,
              tvaCode: dto.isTvaPayer ? dto.tvaCode : undefined,
              cityId,
              categoryId,
              contactPhone: dto.contactPhone,
              contactEmail: dto.contactEmail,
            },
          });

          await tx.$executeRaw`
            SELECT set_config('app.current_company_id', ${company.id}, true)
          `;

          await tx.companyMember.create({
            data: {
              companyId: company.id,
              userId: user.id,
              masterId: master?.id,
              role: CompanyRole.OWNER,
              status: CompanyMemberStatus.ACTIVE,
            },
          });

          await this.subscriptions.ensureSubscription(tx, company.id);

          await this.companyContext.invalidateUserCompanyCache(user.id);

          return tx.company.findUnique({
            where: { id: company.id },
            include: COMPANY_INCLUDE_BASE,
          });
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw AppErrors.conflict('Company with this IDNO already exists');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw AppErrors.badRequest('Invalid company reference data');
      }

      throw error;
    }
  }

  private async resolveCityId(
    tx: Prisma.TransactionClient,
    cityIdOrSlug: string,
  ): Promise<string> {
    const trimmed = cityIdOrSlug.trim();
    const city = await tx.city.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { slug: { equals: trimmed, mode: 'insensitive' } },
          { name: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!city) {
      throw AppErrors.badRequest('Invalid city');
    }

    return city.id;
  }

  private async resolveCategoryId(
    tx: Prisma.TransactionClient,
    categoryIdOrSlug: string,
  ): Promise<string> {
    const trimmed = categoryIdOrSlug.trim();
    const category = await tx.category.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { slug: { equals: trimmed, mode: 'insensitive' } },
          { name: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!category) {
      throw AppErrors.badRequest('Invalid category');
    }

    return category.id;
  }

  private createInitialSlug(name: string): string {
    const base = generateSlug(name) || 'company';
    return `${base}-${randomUUID().slice(0, 8)}`;
  }
}
