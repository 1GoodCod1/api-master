import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { RequestWithOptionalUser } from '../../../common/decorators/get-user.decorator';
import { RecommendationsService } from './recommendations.service';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { TrackActivityDto } from './dto/track-activity.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('personalized')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get personalized recommendations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'cityId',
    required: false,
    description:
      'Client city (from geolocation / saved preference) to boost local masters',
  })
  async getPersonalized(
    @Req() req: RequestWithOptionalUser,
    @Query('limit') limit?: string,
    @Query('cityId') cityId?: string,
  ): Promise<unknown[]> {
    return this.recommendationsService.getPersonalizedRecommendations(
      req.user?.id,
      this.extractSessionId(req),
      limit ? parseInt(limit) : 10,
      cityId,
    );
  }

  @Get('similar/:masterId')
  @ApiOperation({ summary: 'Get similar masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSimilar(
    @Param('masterId') masterId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getSimilarMasters(
      masterId,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('recently-viewed')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get recently viewed masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentlyViewed(
    @Req() req: RequestWithOptionalUser,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getRecentlyViewed(
      req.user?.id,
      this.extractSessionId(req),
      limit ? parseInt(limit) : 10,
    );
  }

  @Post('track')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Track user activity' })
  async trackActivity(
    @Body() dto: TrackActivityDto,
    @Req() req: RequestWithOptionalUser,
  ): Promise<{ success: boolean }> {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      req.ip ||
      (typeof forwarded === 'string' ? forwarded : forwarded?.[0]) ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const userAgentStr =
      typeof userAgent === 'string' ? userAgent : userAgent?.[0];

    await this.recommendationsService.trackActivity({
      ...dto,
      userId: req.user?.id,
      sessionId: this.extractSessionId(req),
      ipAddress,
      userAgent: userAgentStr,
    });

    return { success: true };
  }

  private extractSessionId(req: RequestWithOptionalUser): string | undefined {
    const reqWithSession = req as RequestWithOptionalUser & {
      sessionID?: string;
    };
    const sessionId = reqWithSession.sessionID ?? req.headers['x-session-id'];
    return typeof sessionId === 'string' ? sessionId : sessionId?.[0];
  }
}
