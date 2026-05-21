import { Injectable } from '@nestjs/common';
import { CompanyServicePriceType, Prisma, type Company } from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import {
  COMPANY_INCLUDE_BASE,
  COMPANY_INCLUDE_PROVIDER,
} from '../companies.constants';
import type {
  CompanyProviderWorkspace,
  CompanyWithProviderRelations,
  CompanyWorkspacePayload,
} from '../companies.types';
import {
  CreateCompanyServiceDto,
  UpdateCompanyServiceDto,
} from '../dto/company-service.dto';
import { CreateCompanyPhotoDto } from '../dto/company-photo.dto';
import { UpdateCompanyProviderProfileDto } from '../dto/update-company-provider-profile.dto';
import { CompaniesAccessService } from './companies-access.service';
import { CompaniesWorkspaceService } from './companies-workspace.service';

@Injectable()
export class CompaniesProviderService {
  constructor(
    private readonly access: CompaniesAccessService,
    private readonly workspace: CompaniesWorkspaceService,
  ) {}

  getProviderProfile(
    user: JwtUser,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      this.access.assertProviderWorkspace(company);

      return tx.company.findUniqueOrThrow({
        where: { id: company.id },
        include: COMPANY_INCLUDE_PROVIDER,
      });
    });
  }

  updateProviderProfile(
    user: JwtUser,
    dto: UpdateCompanyProviderProfileDto,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        const categoryId = dto.categoryId
          ? await this.resolveCategoryId(tx, dto.categoryId)
          : undefined;

        const updated = await tx.company.update({
          where: { id: company.id },
          data: {
            description: dto.description,
            categoryId,
            contactPhone: dto.contactPhone,
            contactEmail: dto.contactEmail,
            logoFileId: dto.logoFileId === null ? null : dto.logoFileId,
            coverFileId: dto.coverFileId === null ? null : dto.coverFileId,
          },
          include: COMPANY_INCLUDE_PROVIDER,
        });

        return updated;
      },
    );
  }

  listServices(user: JwtUser) {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      this.access.assertProviderWorkspace(company);
      return tx.companyService.findMany({
        where: { companyId: company.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  createService(user: JwtUser, dto: CreateCompanyServiceDto) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        if (
          dto.priceType === CompanyServicePriceType.FIXED &&
          dto.price == null
        ) {
          throw AppErrors.badRequest(
            'Price is required for fixed-price services',
          );
        }

        return tx.companyService.create({
          data: {
            companyId: company.id,
            title: dto.title,
            description: dto.description,
            priceType: dto.priceType,
            price:
              dto.priceType === CompanyServicePriceType.FIXED
                ? dto.price
                : null,
            currency: dto.currency ?? 'MDL',
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      },
    );
  }

  updateService(
    user: JwtUser,
    serviceId: string,
    dto: UpdateCompanyServiceDto,
  ) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        const existing = await tx.companyService.findFirst({
          where: { id: serviceId, companyId: company.id },
        });
        if (!existing) {
          throw AppErrors.notFound('Company service not found');
        }

        const nextPriceType = dto.priceType ?? existing.priceType;

        return tx.companyService.update({
          where: { id: serviceId },
          data: {
            title: dto.title,
            description: dto.description,
            priceType: dto.priceType,
            price:
              dto.price === null
                ? null
                : (dto.price ??
                  (nextPriceType === CompanyServicePriceType.NEGOTIABLE
                    ? null
                    : existing.price)),
            currency: dto.currency,
            sortOrder: dto.sortOrder,
            isActive: dto.isActive,
          },
        });
      },
    );
  }

  deleteService(user: JwtUser, serviceId: string) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        const existing = await tx.companyService.findFirst({
          where: { id: serviceId, companyId: company.id },
        });
        if (!existing) {
          throw AppErrors.notFound('Company service not found');
        }

        await tx.companyService.delete({ where: { id: serviceId } });
        return { success: true };
      },
    );
  }

  listPhotos(user: JwtUser) {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      this.access.assertProviderWorkspace(company);
      return tx.companyPhoto.findMany({
        where: { companyId: company.id },
        include: {
          file: {
            select: { id: true, path: true, filename: true, mimetype: true },
          },
        },
        orderBy: { order: 'asc' },
      });
    });
  }

  addPhoto(user: JwtUser, dto: CreateCompanyPhotoDto) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        return tx.companyPhoto.create({
          data: {
            companyId: company.id,
            fileId: dto.fileId,
            caption: dto.caption,
            order: dto.order ?? 0,
          },
          include: {
            file: {
              select: { id: true, path: true, filename: true, mimetype: true },
            },
          },
        });
      },
    );
  }

  deletePhoto(user: JwtUser, photoId: string) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanManageProvider(membership);

        const existing = await tx.companyPhoto.findFirst({
          where: { id: photoId, companyId: company.id },
        });
        if (!existing) {
          throw AppErrors.notFound('Company photo not found');
        }

        await tx.companyPhoto.delete({ where: { id: photoId } });
        return { success: true };
      },
    );
  }

  async publishProfile(user: JwtUser): Promise<CompanyWorkspacePayload> {
    const result = await this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanPublish(membership);

        const readiness = await this.getPublishReadiness(tx, company);
        if (!readiness.canPublish) {
          throw AppErrors.badRequest(
            'Company profile is not ready for publication',
          );
        }

        await tx.company.update({
          where: { id: company.id },
          data: { isPublished: true },
        });

        const updatedCompany = await tx.company.findUniqueOrThrow({
          where: { id: company.id },
          include: COMPANY_INCLUDE_BASE,
        });

        return this.workspace.buildWorkspacePayload(
          tx,
          updatedCompany,
          membership,
        );
      },
    );

    if (!result) {
      throw AppErrors.notFound('Company not found');
    }

    return result;
  }

  async unpublishProfile(user: JwtUser): Promise<CompanyWorkspacePayload> {
    const result = await this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertProviderWorkspace(company);
        this.access.assertCanPublish(membership);

        await tx.company.update({
          where: { id: company.id },
          data: { isPublished: false },
        });

        const updatedCompany = await tx.company.findUniqueOrThrow({
          where: { id: company.id },
          include: COMPANY_INCLUDE_BASE,
        });

        return this.workspace.buildWorkspacePayload(
          tx,
          updatedCompany,
          membership,
        );
      },
    );

    if (!result) {
      throw AppErrors.notFound('Company not found');
    }

    return result;
  }

  async getPublishReadiness(
    tx: Prisma.TransactionClient,
    company: Company,
  ): Promise<CompanyProviderWorkspace> {
    const servicesCount = await tx.companyService.count({
      where: { companyId: company.id, isActive: true },
    });
    const profileCompletionPercent = this.calculateProfileCompletion(company);

    return {
      servicesCount,
      teamMembersCount: company.teamSize,
      isPublished: company.isPublished,
      isVerified: company.isVerified,
      canPublish:
        !company.isPublished &&
        profileCompletionPercent >= 60 &&
        Boolean(company.categoryId) &&
        Boolean(company.description?.trim()) &&
        servicesCount > 0,
      profileCompletionPercent,
    };
  }

  private calculateProfileCompletion(company: Company): number {
    const checks = [
      Boolean(company.name?.trim()),
      Boolean(company.legalName?.trim()),
      Boolean(company.categoryId),
      Boolean(company.description?.trim()),
      Boolean(company.contactPhone?.trim() || company.contactEmail?.trim()),
      Boolean(company.logoFileId),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
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
}
