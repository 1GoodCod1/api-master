import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CONTROLLER_PATH } from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import { decodeId, encodeId } from '../../shared/utils/id-encoder';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersProfileService } from './services/masters-profile.service';
import { SetMasterAvatarDto } from './dto/set-avatar.dto';

@ApiTags('Masters Media')
@Controller(CONTROLLER_PATH.masters)
export class MastersMediaController {
  constructor(
    private readonly photosService: MastersPhotosService,
    private readonly profileService: MastersProfileService,
  ) {}

  private onInvalidate(masterId: string, slug?: string | null) {
    return this.profileService.invalidateMasterCache(
      masterId,
      slug,
      encodeId(masterId),
    );
  }

  @Get(':slug/photos')
  @ApiOperation({ summary: 'Get master photos (public, max 15)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMasterPhotos(
    @Param('slug') slugOrId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 15,
  ) {
    const decodedId = decodeId(slugOrId);
    const identifier = decodedId || slugOrId;
    return this.photosService.getMasterPhotos(identifier, limit);
  }

  @Patch('avatar/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set current user master avatar by fileId' })
  async setAvatar(@Body() dto: SetMasterAvatarDto, @GetUser() user: JwtUser) {
    return this.photosService.setMyAvatar(user.id, dto.fileId, (m, s) =>
      this.onInvalidate(m, s),
    );
  }

  @Get('photos/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my photos' })
  async getMyPhotos(@GetUser() user: JwtUser) {
    return this.photosService.getMyPhotos(user.id);
  }

  @Delete('photos/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get by my photo by id' })
  async removeMyPhoto(
    @Param('fileId') fileId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.photosService.removeMyPhoto(user.id, fileId, (m, s) =>
      this.onInvalidate(m, s),
    );
  }
}
