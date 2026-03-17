import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';

/**
 * Admin panel module (ADMIN only).
 * Analytics, Export, Reports are used by other roles (MASTER, CLIENT) — imported separately in app.module.
 */
@Module({
  imports: [AdminModule],
})
export class AdminGroupModule {}
