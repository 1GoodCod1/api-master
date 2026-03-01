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
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type {
  RequestWithOptionalUser,
  RequestWithUser,
} from '../../common/decorators/get-user.decorator';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.filesService.uploadFile(file, req.user.id);
  }

  @Post('upload-many')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 10 files (guest allowed)' })
  async uploadMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithOptionalUser,
    @Query('forLead') forLead?: string,
  ) {
    const userId = req.user?.id ?? null;
    const skipClientGallery = forLead === 'true' || forLead === '1';
    return this.filesService.uploadMany(files, userId, {
      skipClientGallery,
    });
  }
}
