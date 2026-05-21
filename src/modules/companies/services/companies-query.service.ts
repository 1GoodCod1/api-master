import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { COMPANY_INCLUDE_BASE } from '../companies.constants';

@Injectable()
export class CompaniesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  getMyCompany(user: JwtUser) {
    return this.prisma.withRlsContext(
      { currentUserId: user.id, userRole: user.role },
      async (tx) => {
        const membership = await tx.companyMember.findFirst({
          where: {
            userId: user.id,
            leftAt: null,
          },
          orderBy: {
            joinedAt: 'asc',
          },
          select: {
            companyId: true,
          },
        });

        if (!membership) {
          return null;
        }

        await tx.$executeRaw`
          SELECT set_config('app.current_company_id', ${membership.companyId}, true)
        `;

        return tx.company.findUnique({
          where: { id: membership.companyId },
          include: COMPANY_INCLUDE_BASE,
        });
      },
    );
  }
}
