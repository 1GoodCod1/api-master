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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active promotions (public)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivePromotions(@Query('limit') limit?: string) {
    return this.promotionsService.findActivePromotions(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Get all active promotions for a specific master' })
  async getActivePromotionsForMaster(@Param('masterId') masterId: string) {
    return this.promotionsService.findActivePromotionsForMaster(masterId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my promotions' })
  async getMyPromotions(@Req() req: RequestWithUser) {
    const masterId = req.user.masterProfile?.id;
    if (!masterId) throw new BadRequestException('Master profile not found');
    return this.promotionsService.findMyPromotions(masterId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a promotion' })
  async create(@Body() dto: CreatePromotionDto, @Req() req: RequestWithUser) {
    const masterId = req.user.masterProfile?.id;
    if (!masterId) throw new BadRequestException('Master profile not found');
    return this.promotionsService.create(masterId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a promotion' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @Req() req: RequestWithUser,
  ) {
    const masterId = req.user.masterProfile?.id;
    if (!masterId) throw new BadRequestException('Master profile not found');
    return this.promotionsService.update(id, masterId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a promotion' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const masterId = req.user.masterProfile?.id;
    if (!masterId) throw new BadRequestException('Master profile not found');
    return this.promotionsService.remove(id, masterId);
  }
}
