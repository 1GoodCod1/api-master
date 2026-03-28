import { UserRole } from '@prisma/client';
import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CacheWarmingService } from './cache-warming.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Cache Warming')
@Controller('cache-warming')
export class CacheWarmingController {
  constructor(private readonly cacheWarmingService: CacheWarmingService) {}

  @Post('warm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger cache warming' })
  @ApiResponse({ status: 200, description: 'Cache warming started' })
  async warmCache() {
    await this.cacheWarmingService.warmCacheManual();
    return { message: 'Cache warming started', success: true };
  }
}
