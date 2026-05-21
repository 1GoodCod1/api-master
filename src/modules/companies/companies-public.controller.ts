import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CONTROLLER_PATH } from '../../common/constants';
import { Public } from '../../common/decorators';
import type {
  PublicCompanyListResponse,
  PublicCompanyProfile,
} from './companies.types';
import { QueryPublicCompaniesDto } from './dto/company-photo.dto';
import { CompaniesPublicService } from './services/companies-public.service';

@ApiTags('Companies')
@Public()
@Controller(`${CONTROLLER_PATH.companies}/public`)
export class CompaniesPublicController {
  constructor(private readonly companiesPublic: CompaniesPublicService) {}

  @Get()
  @ApiOperation({ summary: 'Search published company profiles' })
  search(
    @Query() dto: QueryPublicCompaniesDto,
  ): Promise<PublicCompanyListResponse> {
    return this.companiesPublic.searchPublicCompanies(dto);
  }

  @Get(':slugOrId')
  @ApiOperation({ summary: 'Get a published company profile by slug or id' })
  getBySlugOrId(
    @Param('slugOrId') slugOrId: string,
  ): Promise<PublicCompanyProfile> {
    return this.companiesPublic.getPublicCompanyByIdOrSlug(slugOrId);
  }

  @Get(':slugOrId/reviews')
  @ApiOperation({ summary: 'List public reviews for a published company' })
  listReviews(
    @Param('slugOrId') slugOrId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.companiesPublic.listCompanyReviews(slugOrId, page, limit);
  }
}
