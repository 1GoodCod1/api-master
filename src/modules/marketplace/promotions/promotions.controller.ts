import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  Plans,
  Roles,
  Verified,
  type RequestWithUser,
} from '../../../common/decorators';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  JwtAuthGuard,
  PlansGuard,
  RolesGuard,
  VerifiedGuard,
} from '../../../common/guards';
import { UserRole } from '@prisma/client';
import { CONTROLLER_PATH, TariffType } from '../../../common/constants';

@ApiTags('Promotions')
@Controller(CONTROLLER_PATH.promotions)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active promotions (public)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivePromotions(@Query('limit') limit?: string) {
    return this.promotionsService.findActivePromotions(limit);
  }

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Get all active promotions for a specific master' })
  async getActivePromotionsForMaster(@Param('masterId') masterId: string) {
    return this.promotionsService.findActivePromotionsForMaster(masterId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard, VerifiedGuard)
  @Roles(UserRole.MASTER)
  @Verified(true)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my promotions' })
  async getMyPromotions(@Req() req: RequestWithUser) {
    return this.promotionsService.findMyPromotionsForUser(req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, VerifiedGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Verified(true)
  @Plans(TariffType.PREMIUM)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a promotion (PREMIUM only)' })
  async create(@Body() dto: CreatePromotionDto, @Req() req: RequestWithUser) {
    return this.promotionsService.createForUser(req.user, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, VerifiedGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Verified(true)
  @Plans(TariffType.PREMIUM)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a promotion (PREMIUM only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.promotionsService.updateForUser(id, req.user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, VerifiedGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Verified(true)
  @Plans(TariffType.PREMIUM)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a promotion (PREMIUM only)' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.promotionsService.removeForUser(id, req.user);
  }
}
