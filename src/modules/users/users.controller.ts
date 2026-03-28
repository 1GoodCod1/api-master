import { UserRole } from '@prisma/client';
import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserAvatarDto } from './dto/set-avatar.dto';
import { PreferredLanguageDto } from './dto/preferred-language.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Static paths (`me`, `stats/...`) MUST be declared before `:id` routes.
 * Otherwise `DELETE /users/me` matches `DELETE :id` with id=me and requires ADMIN.
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить статистику по пользователям (Admin only)',
  })
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Удалить собственный аккаунт (GDPR Art. 17 — Right to Erasure)',
  })
  async removeSelf(@Req() req: RequestWithUser) {
    return this.usersService.removeSelf(req.user.id);
  }

  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Экспорт персональных данных в PDF (GDPR Art. 20 — Data Portability)',
  })
  async exportPersonalData(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Query('locale') locale?: string,
  ) {
    const lang = locale?.toLowerCase().startsWith('ru')
      ? 'ru'
      : locale?.toLowerCase().startsWith('ro')
        ? 'ro'
        : 'en';
    await this.usersService.exportPersonalDataPdf(req.user.id, res, lang);
  }

  @Patch('me/preferred-language')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Установить язык для email-шаблонов (en | ru | ro)',
  })
  async setPreferredLanguage(
    @Req() req: RequestWithUser,
    @Body() dto: PreferredLanguageDto,
  ) {
    return this.usersService.setPreferredLanguage(req.user.id, dto.lang);
  }

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Установить или удалить аватар текущего пользователя',
    description:
      'Укажите fileId для установки аватара, или пустую строку/null для удаления',
  })
  async setMyAvatar(
    @Req() req: RequestWithUser,
    @Body() dto: SetUserAvatarDto,
  ) {
    return this.usersService.setAvatar(req.user.id, dto.fileId);
  }

  @Get('me/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить мои фотографии (только для роли CLIENT)' })
  async getMyPhotos(@Req() req: RequestWithUser) {
    return this.usersService.getMyPhotos(req.user.id);
  }

  @Delete('me/photos/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить фотографию из галереи клиента' })
  async removeMyPhoto(
    @Req() req: RequestWithUser,
    @Param('fileId') fileId: string,
  ) {
    return this.usersService.removeMyPhoto(req.user.id, fileId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить данные пользователя по ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить данные пользователя (Admin only)' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить пользователя (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Заблокировать/разблокировать пользователя (Admin only)',
  })
  async toggleBan(@Param('id') id: string) {
    return this.usersService.toggleBan(id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Верифицировать/снять верификацию пользователя (Admin only)',
  })
  async toggleVerify(@Param('id') id: string) {
    return this.usersService.toggleVerify(id);
  }
}
