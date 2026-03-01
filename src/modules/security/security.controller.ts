import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить историю входов пользователя' })
  async getMyLoginHistory(@Req() req: RequestWithUser) {
    return this.securityService.getLoginHistory(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Смена пароля' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.securityService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('ban-user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Заблокировать пользователя (Admin only)' })
  async banUser(
    @Param('userId') userId: string,
    @Body() body: { reason: string },
    @Req() req: RequestWithUser,
  ) {
    await this.securityService.banUser(userId, body.reason, req.user.id);
    return { success: true, message: 'Пользователь заблокирован' };
  }

  @Post('unban-user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Разблокировать пользователя (Admin only)' })
  async unbanUser(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.securityService.unbanUser(userId, req.user.id);
    return { success: true, message: 'Пользователь разблокирован' };
  }

  @Post('blacklist-ip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить IP в черный список (Admin only)' })
  async blacklistIp(
    @Body() body: { ipAddress: string; reason: string; expiresAt?: Date },
    @Req() req: RequestWithUser,
  ) {
    await this.securityService.blacklistIp(
      body.ipAddress,
      body.reason,
      req.user.id,
      body.expiresAt,
    );
    return { success: true, message: 'IP добавлен в черный список' };
  }

  @Post('remove-ip-blacklist/:ipAddress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить IP из черного списка (Admin only)' })
  async removeIpFromBlacklist(@Param('ipAddress') ipAddress: string) {
    await this.securityService.removeIpFromBlacklist(ipAddress);
    return { success: true, message: 'IP удален из черного списка' };
  }
}
