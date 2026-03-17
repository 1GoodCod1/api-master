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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cities' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    return this.citiesService.findAllFromQuery(isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by ID' })
  async findOne(@Param('id') id: string) {
    return this.citiesService.findOne(id);
  }

  @Get(':id/masters')
  @ApiOperation({ summary: 'Get masters in city' })
  async getMasters(@Param('id') id: string) {
    return this.citiesService.getMasters(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create city (admin only)' })
  async create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update city (admin only)' })
  async update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return this.citiesService.update(id, updateCityDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete city (admin only)' })
  async remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle city active status (admin only)' })
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
  ) {
    return this.citiesService.toggleActive(id, isActive);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cities statistics (admin only)' })
  async getStatistics() {
    return this.citiesService.getStatistics();
  }
}
