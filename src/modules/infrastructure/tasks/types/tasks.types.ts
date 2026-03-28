import type { Master, User } from '@prisma/client';

export interface MasterWithUser extends Master {
  user: Pick<User, 'id' | 'email' | 'phone'>;
}
