import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MastersSearchService } from './services/masters-search.service';
import {
  CONTROLLER_PATH,
  SEARCH_THROTTLE_LIMIT,
  SEARCH_THROTTLE_TTL_MS,
  SORT_DESC,
} from '../../../common/constants';

@ApiTags('Search')
@Controller(CONTROLLER_PATH.search)
export class SearchController {
  constructor(private readonly mastersSearchService: MastersSearchService) {}

  @Get('masters')
  @Throttle({
    default: { limit: SEARCH_THROTTLE_LIMIT, ttl: SEARCH_THROTTLE_TTL_MS },
  })
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

    return this.mastersSearchService.findAll(searchDto);
  }
}
