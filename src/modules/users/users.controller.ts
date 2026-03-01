import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserAvatarDto } from './dto/set-avatar.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить данные пользователя по ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить данные пользователя (Admin only)' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить пользователя (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Заблокировать/разблокировать пользователя (Admin only)',
  })
  async toggleBan(@Param('id') id: string) {
    return this.usersService.toggleBan(id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Верифицировать/снять верификацию пользователя (Admin only)',
  })
  async toggleVerify(@Param('id') id: string) {
    return this.usersService.toggleVerify(id);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить статистику по пользователям (Admin only)',
  })
  async getStatistics() {
    return this.usersService.getStatistics();
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
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить мои фотографии (только для роли CLIENT)' })
  async getMyPhotos(@Req() req: RequestWithUser) {
    return this.usersService.getMyPhotos(req.user.id);
  }

  @Delete('me/photos/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить фотографию из галереи клиента' })
  async removeMyPhoto(
    @Req() req: RequestWithUser,
    @Param('fileId') fileId: string,
  ) {
    return this.usersService.removeMyPhoto(req.user.id, fileId);
  }
}
