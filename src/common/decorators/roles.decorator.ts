import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

/** Ключ метаданных для `@Roles()`. */
export const ROLES_KEY = 'roles';

/** Ограничение доступа к эндпоинту по ролям пользователя. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
