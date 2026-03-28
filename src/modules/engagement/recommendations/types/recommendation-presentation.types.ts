import type {
  Master,
  Category,
  City,
  User,
  MasterPhoto,
  File,
} from '@prisma/client';

export type MasterWithRecommendationMeta = Master & {
  category: Category;
  city: City;
  user: Pick<User, 'id' | 'isVerified'>;
  photos: (MasterPhoto & { file: File })[];
  recommendationScore?: number;
  reasons?: string[];
};
