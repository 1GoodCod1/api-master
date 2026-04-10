import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PortfolioService } from './services/portfolio.service';
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
  ReorderPortfolioDto,
} from './dto/portfolio.dto';
import { JwtAuthGuard, PlansGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Plans, Roles } from '../../../common/decorators';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { UserRole } from '@prisma/client';
import { CONTROLLER_PATH, TariffType } from '../../../common/constants';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

@ApiTags('Portfolio')
@Controller(CONTROLLER_PATH.portfolio)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  // ─── Публичные эндпоинты ────────────────────────────────────

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Get portfolio items for master (public)' })
  @ApiQuery({ name: 'serviceTag', required: false })
  async findAll(
    @Param('masterId') masterId: string,
    @Query('serviceTag') serviceTag?: string,
  ) {
    return this.portfolioService.findAll(masterId, serviceTag);
  }

  @Get('master/:masterId/tags')
  @ApiOperation({ summary: 'Get unique service tags for master portfolio' })
  async getServiceTags(@Param('masterId') masterId: string) {
    return this.portfolioService.getServiceTags(masterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single portfolio item' })
  async findOne(@Param('id') id: string) {
    return this.portfolioService.findOne(id);
  }

  // ─── Только для мастера ─────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create portfolio item (VIP+ only)' })
  async create(@GetUser() user: JwtUser, @Body() dto: CreatePortfolioItemDto) {
    const masterId = user.masterProfile?.id;
    if (!masterId)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return this.portfolioService.create(masterId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update portfolio item (VIP+ only)' })
  async update(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    const masterId = user.masterProfile?.id;
    if (!masterId)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return this.portfolioService.update(id, masterId, dto);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder portfolio items (VIP+ only)' })
  async reorder(@GetUser() user: JwtUser, @Body() dto: ReorderPortfolioDto) {
    const masterId = user.masterProfile?.id;
    if (!masterId)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return this.portfolioService.reorder(masterId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete portfolio item (VIP+ only)' })
  async remove(@Param('id') id: string, @GetUser() user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return this.portfolioService.remove(id, masterId);
  }
}
