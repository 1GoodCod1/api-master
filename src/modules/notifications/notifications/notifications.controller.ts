import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import type { NotificationCategory, NotificationType } from '@prisma/client';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Notifications')
@Controller(CONTROLLER_PATH.notifications)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить уведомления пользователя (cursor-paginated)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by notification category',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by notification type (e.g. IN_APP)',
  })
  async getNotifications(
    @GetUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.getUserNotifications(user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Math.min(100, Math.max(1, Number(limit) || 50)) : 50,
      cursor,
      unreadOnly: unreadOnly === 'true',
      category: category as NotificationCategory | undefined,
      type: type as NotificationType | undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Получить количество непрочитанных уведомлений' })
  async getUnreadCount(@GetUser() user: JwtUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  async markAsRead(@GetUser() user: JwtUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  async markAllAsRead(@GetUser() user: JwtUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить уведомление' })
  async deleteNotification(@GetUser() user: JwtUser, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Удалить все уведомления пользователя' })
  async deleteAllNotifications(@GetUser() user: JwtUser) {
    return this.notificationsService.deleteAllNotifications(user.id);
  }
}
