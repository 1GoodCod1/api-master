import { UserRole } from '@prisma/client';
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
import { Roles, type RequestWithUser } from '../../../common/decorators';
import { SecurityService } from './security.service';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Security')
@Controller(CONTROLLER_PATH.security)
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
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Заблокировать пользователя (Admin only)' })
  async banUser(
    @Param('userId') userId: string,
    @Body() body: { reason: string },
    @Req() req: RequestWithUser,
  ) {
    await this.securityService.banUser(userId, body.reason, req.user.id);
    return { success: true, message: 'User has been banned' };
  }

  @Post('unban-user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Разблокировать пользователя (Admin only)' })
  async unbanUser(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.securityService.unbanUser(userId, req.user.id);
    return { success: true, message: 'User has been unbanned' };
  }

  @Post('blacklist-ip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
    return { success: true, message: 'IP added to blocklist' };
  }

  @Post('remove-ip-blacklist/:ipAddress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить IP из черного списка (Admin only)' })
  async removeIpFromBlacklist(@Param('ipAddress') ipAddress: string) {
    await this.securityService.removeIpFromBlacklist(ipAddress);
    return { success: true, message: 'IP removed from blocklist' };
  }
}
