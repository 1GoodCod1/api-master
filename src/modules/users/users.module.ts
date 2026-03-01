import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { UsersQueryService } from './services/users-query.service';
import { UsersManageService } from './services/users-manage.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UsersQueryService, UsersManageService],
  exports: [UsersService],
})
export class UsersModule {}
