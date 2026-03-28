import { UserRole } from '@prisma/client';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { RequestWithUser } from '../../../common/decorators/get-user.decorator';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все тарифы (публично)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    const filters: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.tariffsService.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Получить только активные тарифы' })
  async getActiveTariffs() {
    return this.tariffsService.getActiveTariffs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о тарифе по ID' })
  async findOne(@Param('id') id: string) {
    return this.tariffsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новый тариф (Admin only)' })
  async create(
    @Req() req: RequestWithUser,
    @Body() createTariffDto: CreateTariffDto,
  ) {
    return this.tariffsService.create(createTariffDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить тариф (Admin only)' })
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateTariffDto: UpdateTariffDto,
  ) {
    return this.tariffsService.update(id, updateTariffDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить тариф (Admin only)' })
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.tariffsService.remove(id, req.user.id);
  }
}
