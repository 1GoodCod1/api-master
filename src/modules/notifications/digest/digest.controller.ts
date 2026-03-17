import { Controller, Post, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../../common/decorators/get-user.decorator';
import { DigestService } from './digest.service';

@ApiTags('Digest')
@Controller('digest')
export class DigestController {
  constructor(private readonly digestService: DigestService) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to digest (auth only, email from user)' })
  async subscribe(@Req() req: RequestWithUser) {
    await this.digestService.subscribe(req.user.id);
    return { success: true };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get digest subscription status' })
  async getStatus(@Req() req: RequestWithUser) {
    return this.digestService.getStatus(req.user.id);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from digest' })
  async unsubscribe(@Req() req: RequestWithUser) {
    await this.digestService.unsubscribe(req.user.id);
    return { success: true };
  }
}
