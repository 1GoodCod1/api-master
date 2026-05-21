import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../modules/shared/database/prisma.module';
import { CompanyContextService } from './company-context.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CompanyContextService],
  exports: [CompanyContextService],
})
export class CompanyContextModule {}
