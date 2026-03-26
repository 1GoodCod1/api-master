import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../../common/decorators/get-user.decorator';
import { WebPushService } from './web-push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';

@ApiTags('Web Push')
@Controller('web-push')
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for frontend subscription' })
  getVapidPublicKey() {
    const publicKey = this.webPushService.getPublicKey()?.trim() ?? '';
    if (!publicKey) {
      throw new ServiceUnavailableException(
        'VAPID is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (e.g. in .env.docker) and restart the API.',
      );
    }
    return { publicKey };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to web push notifications' })
  async subscribe(@Body() dto: SubscribePushDto, @Req() req: RequestWithUser) {
    const subscription = await this.webPushService.subscribe(
      req.user.id,
      dto.endpoint,
      dto.p256dh,
      dto.auth,
      dto.userAgent,
    );
    return { success: true, id: subscription.id };
  }

  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from web push notifications' })
  async unsubscribe(@Body() dto: UnsubscribePushDto) {
    return this.webPushService.unsubscribe(dto.endpoint);
  }
}
