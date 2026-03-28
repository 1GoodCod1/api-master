import type { Category } from '@prisma/client';

export type CategoryWithMastersCount = Category & {
  _count: { masters: number };
};
