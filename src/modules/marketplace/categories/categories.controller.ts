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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { ApiPaginationQueries, Roles } from '../../../common/decorators';
import {
  CONTROLLER_PATH,
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from '../../../common/constants';

const PUBLIC_READ_THROTTLE = {
  default: {
    limit: PUBLIC_READ_THROTTLE_LIMIT,
    ttl: PUBLIC_READ_THROTTLE_TTL_MS,
  },
};

@ApiTags('Categories')
@Controller(CONTROLLER_PATH.categories)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    return this.categoriesService.findAllFromQuery(isActive);
  }

  @Get(':id')
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get(':id/masters')
  @Throttle(PUBLIC_READ_THROTTLE)
  @ApiOperation({ summary: 'Get masters in category (cursor-paginated)' })
  @ApiPaginationQueries()
  async getMasters(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.categoriesService.getMastersFromQuery(id, page, limit, cursor);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin only)' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (admin only)' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle category active status (admin only)' })
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
  ) {
    return this.categoriesService.toggleActive(id, isActive);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get categories statistics (admin only)' })
  async getStatistics() {
    return this.categoriesService.getStatistics();
  }
}
