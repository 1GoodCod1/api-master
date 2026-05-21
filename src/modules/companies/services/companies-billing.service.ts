import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppErrors } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { COMPANY_INCLUDE_BASE } from '../companies.constants';
import type { CompanyWithRelations } from '../companies.types';
import { UpdateCompanyLegalDto } from '../dto/update-company-legal.dto';
import { CompaniesAccessService } from './companies-access.service';

@Injectable()
export class CompaniesBillingService {
  constructor(private readonly access: CompaniesAccessService) {}

  updateLegal(
    user: JwtUser,
    dto: UpdateCompanyLegalDto,
  ): Promise<CompanyWithRelations | null> {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership }) => {
        this.access.assertCanManageLegal(membership);

        const existingIdno = await tx.company.findFirst({
          where: {
            idno: dto.idno,
            NOT: { id: membership.companyId },
          },
          select: { id: true },
        });
        if (existingIdno) {
          throw AppErrors.conflict('A company with this IDNO already exists');
        }

        const data: Prisma.CompanyUpdateInput = {
          legalName: dto.legalName,
          idno: dto.idno,
          legalAddress: dto.legalAddress,
          isTvaPayer: dto.isTvaPayer,
          tvaCode: dto.isTvaPayer ? dto.tvaCode : null,
          billingEmail: dto.billingEmail ?? null,
          billingPhone: dto.billingPhone ?? null,
          bankName: dto.bankName ?? null,
          bankAccount: dto.bankAccount ?? null,
        };

        return tx.company.update({
          where: { id: membership.companyId },
          data,
          include: COMPANY_INCLUDE_BASE,
        });
      },
    );
  }
}
