import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { SORT_DESC } from '../../shared/constants/sort-order.constants';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly mastersService: MastersService) {}

  @Get('masters')
  @ApiOperation({ summary: 'Simple master search with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'experience', required: false, type: Number })
  async searchMasters(
    @Query('category') categoryId?: string,
    @Query('city') cityId?: string,
    @Query('rating') minRating?: number,
    @Query('experience') minExperience?: number,
  ) {
    const searchDto = {
      categoryId,
      cityId,
      minRating: minRating ? Number(minRating) : undefined,
      minExperience: minExperience ? Number(minExperience) : undefined,
      page: 1,
      limit: 20,
      sortBy: 'rating' as const,
      sortOrder: SORT_DESC,
    };

    return this.mastersService.findAll(searchDto);
  }
}
