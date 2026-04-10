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
import { Roles, type RequestWithUser } from '../../common/decorators';
import PDFDocument from 'pdfkit';
import { buildPersonalDataPdf } from './services/personal-data-pdf.builder';
import type { PersonalDataPdfData } from './types';
import { UsersQueryService } from './services/users-query.service';
import { UsersManageService } from './services/users-manage.service';
import { UsersAvatarService } from './services/users-avatar.service';
import { UsersGdprService } from './services/users-gdpr.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserAvatarDto } from './dto/set-avatar.dto';
import { PreferredLanguageDto } from './dto/preferred-language.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Users')
@Controller(CONTROLLER_PATH.users)
export class UsersController {
  constructor(
    private readonly queryService: UsersQueryService,
    private readonly manageService: UsersManageService,
    private readonly avatarService: UsersAvatarService,
    private readonly gdprService: UsersGdprService,
  ) {}

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить статистику по пользователям (Admin only)',
  })
  async getStatistics() {
    return this.queryService.getStatistics();
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Удалить собственный аккаунт (GDPR Art. 17 — Right to Erasure)',
  })
  async removeSelf(@Req() req: RequestWithUser) {
    return this.gdprService.removeSelf(req.user.id);
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
    const data: PersonalDataPdfData =
      await this.gdprService.getPersonalDataForPdf(req.user.id);
    const filename = `my-data-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    buildPersonalDataPdf(doc, data, lang);
    doc.end();
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
    await this.manageService.setPreferredLanguage(req.user.id, dto.lang);
    return { preferredLanguage: dto.lang };
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
    return this.avatarService.setAvatar(req.user.id, dto.fileId);
  }

  @Get('me/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить мои фотографии (только для роли CLIENT)' })
  async getMyPhotos(@Req() req: RequestWithUser) {
    return this.queryService.getMyPhotos(req.user.id);
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
    return this.avatarService.removeMyPhoto(req.user.id, fileId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить данные пользователя по ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.queryService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить данные пользователя (Admin only)' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.manageService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить пользователя (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.manageService.remove(id);
  }

  @Put(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Заблокировать/разблокировать пользователя (Admin only)',
  })
  async toggleBan(@Param('id') id: string) {
    return this.manageService.toggleBan(id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Верифицировать/снять верификацию пользователя (Admin only)',
  })
  async toggleVerify(@Param('id') id: string) {
    return this.manageService.toggleVerify(id);
  }
}
