import { Injectable } from '@nestjs/common';
import { CompanyMode, Prisma } from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { COMPANY_PUBLIC_INCLUDE } from '../companies.constants';
import type {
  PublicCompanyListResponse,
  PublicCompanyProfile,
} from '../companies.types';
import { QueryPublicCompaniesDto } from '../dto/company-photo.dto';
import { CompaniesReviewsService } from './companies-reviews.service';

const PUBLIC_PROVIDER_MODES: CompanyMode[] = [
  CompanyMode.PROVIDER,
  CompanyMode.BOTH,
];

@Injectable()
export class CompaniesPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesReviews: CompaniesReviewsService,
  ) {}

  searchPublicCompanies(
    dto: QueryPublicCompaniesDto,
  ): Promise<PublicCompanyListResponse> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = dto.search?.trim();

    return this.prisma.withRlsContext({}, async (tx) => {
      const where: Prisma.CompanyWhereInput = {
        isPublished: true,
        mode: { in: PUBLIC_PROVIDER_MODES },
        ...(dto.cityId ? { cityId: dto.cityId } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { legalName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        tx.company.findMany({
          where,
          include: {
            city: true,
            category: true,
            logoFile: {
              select: { id: true, path: true },
            },
            services: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              take: 3,
            },
          },
          orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        tx.company.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
      };
    });
  }

  getPublicCompanyBySlug(slug: string): Promise<PublicCompanyProfile | null> {
    const normalizedSlug = slug.trim();

    return this.prisma.withRlsContext({}, async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          slug: { equals: normalizedSlug, mode: 'insensitive' },
          isPublished: true,
          mode: { in: PUBLIC_PROVIDER_MODES },
        },
        include: COMPANY_PUBLIC_INCLUDE,
      });

      return company;
    });
  }

  getPublicCompanyByIdOrSlug(idOrSlug: string): Promise<PublicCompanyProfile> {
    const normalized = idOrSlug.trim();

    return this.prisma.withRlsContext({}, async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          isPublished: true,
          mode: { in: PUBLIC_PROVIDER_MODES },
          OR: [
            { id: normalized },
            { slug: { equals: normalized, mode: 'insensitive' } },
          ],
        },
        include: COMPANY_PUBLIC_INCLUDE,
      });

      if (!company) {
        throw AppErrors.notFound('Company not found');
      }

      return company;
    });
  }

  listCompanyReviews(slugOrId: string, page?: number, limit?: number) {
    return this.companiesReviews.listPublicCompanyReviews(
      slugOrId,
      page,
      limit,
    );
  }
}
