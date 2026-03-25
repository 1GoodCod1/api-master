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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PlansGuard } from '../../../common/guards/plans.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Plans } from '../../../common/decorators/plans.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { TariffType } from '@prisma/client';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  // ─── Public endpoints ───────────────────────────────────────

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

  // ─── Master-only endpoints ──────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles('MASTER')
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create portfolio item (VIP+ only)' })
  async create(@GetUser() user: JwtUser, @Body() dto: CreatePortfolioItemDto) {
    const masterId = user.masterProfile?.id;
    if (!masterId) throw new Error('Master profile not found');
    return this.portfolioService.create(masterId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles('MASTER')
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update portfolio item (VIP+ only)' })
  async update(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    const masterId = user.masterProfile?.id;
    if (!masterId) throw new Error('Master profile not found');
    return this.portfolioService.update(id, masterId, dto);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles('MASTER')
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder portfolio items (VIP+ only)' })
  async reorder(@GetUser() user: JwtUser, @Body() dto: ReorderPortfolioDto) {
    const masterId = user.masterProfile?.id;
    if (!masterId) throw new Error('Master profile not found');
    return this.portfolioService.reorder(masterId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles('MASTER')
  @Plans(TariffType.VIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete portfolio item (VIP+ only)' })
  async remove(@Param('id') id: string, @GetUser() user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId) throw new Error('Master profile not found');
    return this.portfolioService.remove(id, masterId);
  }
}
