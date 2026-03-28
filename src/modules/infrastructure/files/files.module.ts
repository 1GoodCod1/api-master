import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesValidationService } from './services/files-validation.service';
import { FilesActionService } from './services/files-action.service';
import { StorageService } from './services/storage.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { FilesController } from './files.controller';
import { createMulterOptions } from './config/multer-config.factory';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: createMulterOptions,
      inject: [ConfigService],
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FilesValidationService,
    FilesActionService,
    StorageService,
  ],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
