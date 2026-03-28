import type { City } from '@prisma/client';

export type CityWithMastersCount = City & {
  _count: { masters: number };
};
