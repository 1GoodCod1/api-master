import { UserRole } from '@prisma/client';
import { CONTROLLER_PATH } from '../../../common/constants';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_TTL_MS,
  SEARCH_THROTTLE_LIMIT,
  SEARCH_THROTTLE_TTL_MS,
} from '../../../common/constants';
import { MastersSearchService } from './services/masters-search.service';
import { MastersSuggestService } from './services/masters-suggest.service';
import { MastersListingService } from './services/masters-listing.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersTariffService } from './services/masters-tariff.service';
import { MastersAvailabilityService } from './services/masters-availability.service';
import { MastersPublicProfileService } from './services/masters-public-profile.service';
import { encodeId } from '../../shared/utils/id-encoder';
import { UpdateMasterDto } from './dto/update-master.dto';
import { UpdateMasterServicesDto } from './dto/update-services.dto';
import { SearchMastersDto } from './dto/search-masters.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { ClaimFreePlanDto } from './dto/claim-free-plan.dto';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '../../../common/guards';
import {
  GetUser,
  Roles,
  type RequestWithOptionalUser,
} from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

const PUBLIC_READ_THROTTLE = {
  default: {
    limit: PUBLIC_READ_THROTTLE_LIMIT,
    ttl: PUBLIC_READ_THROTTLE_TTL_MS,
  },
};

const SEARCH_THROTTLE = {
  default: { limit: SEARCH_THROTTLE_LIMIT, ttl: SEARCH_THROTTLE_TTL_MS },
};

@ApiTags('Masters')
@Controller(CONTROLLER_PATH.masters)
export class MastersController {
  constructor(
    private readonly searchService: MastersSearchService,
    private readonly suggestService: MastersSuggestService,
    private readonly listingService: MastersListingService,
    private readonly profileService: MastersProfileService,
    private readonly tariffService: MastersTariffService,
    private readonly availabilityService: MastersAvailabilityService,
    private readonly publicProfileService: MastersPublicProfileService,
  ) {}

  private onInvalidate(masterId: string, slug?: string | null) {
    return this.profileService.invalidateMasterCache(
      masterId,
      slug,
      encodeId(masterId),
    );
  }

  @Get()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Search masters with filters' })
  async findAll(@Query() searchDto: SearchMastersDto) {
    return this.searchService.findAll(searchDto);
  }

  @Get('suggest')
  @Throttle(SEARCH_THROTTLE)
  @ApiOperation({
    summary:
      'Smart search suggestions (categories, masters, services) with fuzzy matching',
  })
  async getSuggestions(@Query() dto: SuggestQueryDto) {
    return this.suggestService.getSuggestions(dto);
  }

  @Get('filters')
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get available search filters' })
  async getFilters() {
    return this.listingService.getSearchFilters();
  }

  @Get('popular')
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get popular masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopularMasters(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.listingService.getPopularMasters(limit);
  }

  @Get('new')
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get new masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNewMasters(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.listingService.getNewMasters(limit);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master profile (authenticated)' })
  async getProfile(@GetUser() user: JwtUser) {
    return this.profileService.getProfile(user.id);
  }

  @Put('profile/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master profile' })
  async updateProfile(
    @GetUser() user: JwtUser,
    @Body() updateDto: UpdateMasterDto,
  ) {
    const allowServices = user.role === UserRole.ADMIN || user.isVerified;
    return this.profileService.updateProfile(user.id, updateDto, allowServices);
  }

  @Patch('profile/me/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master services only' })
  async updateServices(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateMasterServicesDto,
  ) {
    return this.profileService.updateServices(user.id, dto.services);
  }

  @Get('tariff/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tariff info' })
  async getTariff(@GetUser() user: JwtUser) {
    return this.tariffService.getTariff(user.id);
  }

  @Post('tariff/claim-free')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Claim free plan (verified masters only, 1-click)',
  })
  async claimFreePlan(@GetUser() user: JwtUser, @Body() dto: ClaimFreePlanDto) {
    return this.tariffService.claimFreePlan(user.id, dto.tariffType, (m, s) =>
      this.onInvalidate(m, s),
    );
  }

  @Patch('online-status/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update master online status (admin override only — masters are tracked automatically via WebSocket)',
  })
  async updateOnlineStatus(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateOnlineStatusDto,
  ) {
    return this.availabilityService.updateOnlineStatus(
      user.id,
      dto.isOnline,
      (m, s) => this.onInvalidate(m, s),
    );
  }

  @Get(':slug')
  @Throttle(PUBLIC_READ_THROTTLE)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get master by slug or ID' })
  async findOne(
    @Param('slug') slugOrId: string,
    @Req() req: RequestWithOptionalUser,
  ): Promise<unknown> {
    return this.publicProfileService.findOne(slugOrId, req, true);
  }
}
