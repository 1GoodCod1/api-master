import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EmailDripService } from './email-drip.service';
import { PrismaModule } from '../shared/database/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, EmailTemplateService, EmailDripService],
  exports: [EmailService, EmailTemplateService, EmailDripService],
})
export class EmailModule {}
