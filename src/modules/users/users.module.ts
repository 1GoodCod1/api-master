import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { CacheModule } from '../shared/cache/cache.module';
import { UsersQueryService } from './services/users-query.service';
import { UsersManageService } from './services/users-manage.service';
import { UsersAvatarService } from './services/users-avatar.service';
import { UsersGdprService } from './services/users-gdpr.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersQueryService,
    UsersManageService,
    UsersAvatarService,
    UsersGdprService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
