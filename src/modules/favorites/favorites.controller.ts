import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorites' })
  @ApiResponse({ status: 200, description: 'List of favorites' })
  async findAll(@Req() req: RequestWithUser) {
    return this.favoritesService.findAll(req.user.id);
  }

  @Post(':masterId')
  @ApiOperation({ summary: 'Add master to favorites' })
  @ApiResponse({ status: 201, description: 'Master added to favorites' })
  @ApiResponse({ status: 404, description: 'Master not found' })
  @ApiResponse({ status: 400, description: 'Already in favorites' })
  async create(
    @Req() req: RequestWithUser,
    @Param('masterId') masterId: string,
  ) {
    return this.favoritesService.create(req.user.id, masterId);
  }

  @Delete(':masterId')
  @ApiOperation({ summary: 'Remove master from favorites' })
  @ApiResponse({ status: 200, description: 'Master removed from favorites' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async remove(
    @Req() req: RequestWithUser,
    @Param('masterId') masterId: string,
  ) {
    return this.favoritesService.remove(req.user.id, masterId);
  }

  @Get('check/:masterId')
  @ApiOperation({ summary: 'Check if master is in favorites' })
  @ApiResponse({ status: 200, description: 'Check result' })
  async check(
    @Req() req: RequestWithUser,
    @Param('masterId') masterId: string,
  ) {
    const isFavorite = await this.favoritesService.check(req.user.id, masterId);
    return { isFavorite };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get favorites count' })
  @ApiResponse({ status: 200, description: 'Favorites count' })
  async count(@Req() req: RequestWithUser) {
    const count = await this.favoritesService.count(req.user.id);
    return { count };
  }
}
