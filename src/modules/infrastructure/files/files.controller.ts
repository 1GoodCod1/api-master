import {
  Controller,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RequireAuthWhenNotForLeadGuard,
} from '../../../common/guards';
import type {
  RequestWithOptionalUser,
  RequestWithUser,
} from '../../../common/decorators';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Files')
@Controller(CONTROLLER_PATH.files)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 uploads per minute per user
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.filesService.uploadFileForUser(file, req.user);
  }

  @Post('upload-many')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 batch uploads per minute
  @UseGuards(OptionalJwtAuthGuard, RequireAuthWhenNotForLeadGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 10 files (guest allowed)' })
  async uploadMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithOptionalUser,
    @Query('forLead') forLead?: string,
  ) {
    return this.filesService.uploadManyForUser(
      files,
      req.user ?? null,
      forLead,
    );
  }
}
