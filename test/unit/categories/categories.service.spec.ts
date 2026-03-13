import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../../../src/modules/categories/categories.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

type PrismaCategoriesMock = {
  category: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  master: { findMany: jest.Mock; count: jest.Mock };
  $queryRaw: jest.Mock;
};

describe('CategoriesService', () => {
  const prisma: PrismaCategoriesMock = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    master: { findMany: jest.fn(), count: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const cache = {
    buildKey: jest.fn((keys: string[]) => keys.join(':')),
    getOrSet: jest.fn(),
    del: jest.fn(),
    invalidate: jest.fn(),
    invalidateWithLeafKey: jest.fn().mockResolvedValue(0),
    keys: {
      categoryWithStats: jest.fn((id: string) => `cache:category:${id}:stats`),
      categoriesAll: jest.fn(() => 'cache:categories:all'),
    },
    patterns: {
      categoriesAll: jest.fn(() => 'cache:categories:all:*'),
      categoriesStatistics: jest.fn(() => 'cache:categories:statistics:*'),
      searchMasters: jest.fn(() => 'cache:search:masters:*'),
    },
    ttl: { categories: 300 },
  } as unknown as jest.Mocked<CacheService>;

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(prisma as unknown as PrismaService, cache);
  });

  describe('findOne', () => {
    it('returns category from cache when available', async () => {
      const cachedCategory = { id: 'c1', name: 'Test', _count: { masters: 5 } };
      cache.getOrSet.mockImplementation(async (_key, fetcher) => fetcher());

      prisma.category.findUnique.mockResolvedValue(cachedCategory);

      const result = await service.findOne('c1');

      expect(result).toEqual(cachedCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        include: { _count: { select: { masters: true } } },
      });
    });

    it('throws NotFoundException when category does not exist', async () => {
      cache.getOrSet.mockImplementation(async (_key, fetcher) => fetcher());
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('c1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when category has masters', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        _count: { masters: 3 },
      });

      await expect(service.remove('c1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('deletes category and invalidates cache when no masters', async () => {
      const deleted = { id: 'c1', name: 'Cat' };
      prisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        _count: { masters: 0 },
      });
      prisma.category.delete.mockResolvedValue(deleted);

      const result = await service.remove('c1');

      expect(result).toEqual(deleted);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(cache.del).toHaveBeenCalledWith('cache:category:c1:stats');
      expect(cache.invalidateWithLeafKey).toHaveBeenCalledWith(
        'cache:categories:all',
        'cache:categories:all:*',
      );
      expect(cache.invalidate).toHaveBeenCalled();
    });
  });
});
