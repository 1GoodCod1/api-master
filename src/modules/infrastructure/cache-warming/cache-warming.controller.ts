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
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Cache Warming')
@Controller(CONTROLLER_PATH.cacheWarming)
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
