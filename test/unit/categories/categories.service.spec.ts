import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../../../src/modules/categories/categories.service';
import type { CategoriesQueryService } from '../../../src/modules/categories/services/categories-query.service';
import type { CategoriesActionService } from '../../../src/modules/categories/services/categories-action.service';

describe('CategoriesService', () => {
  const queryService = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Pick<CategoriesQueryService, 'findOne'>>;

  const actionService = {
    remove: jest.fn(),
  } as unknown as jest.Mocked<Pick<CategoriesActionService, 'remove'>>;

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(
      queryService as unknown as CategoriesQueryService,
      actionService as unknown as CategoriesActionService,
    );
  });

  describe('findOne', () => {
    it('returns category from cache when available', async () => {
      const cachedCategory = { id: 'c1', name: 'Test', _count: { masters: 5 } };
      queryService.findOne.mockResolvedValue(
        cachedCategory as Awaited<
          ReturnType<CategoriesQueryService['findOne']>
        >,
      );

      const result = await service.findOne('c1');

      expect(result).toEqual(cachedCategory);
      expect(queryService.findOne).toHaveBeenCalledWith('c1');
    });

    it('throws NotFoundException when category does not exist', async () => {
      queryService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.findOne('invalid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when category does not exist', async () => {
      actionService.remove.mockRejectedValue(new NotFoundException());

      await expect(service.remove('c1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when category has masters', async () => {
      actionService.remove.mockRejectedValue(new BadRequestException());

      await expect(service.remove('c1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deletes category and invalidates cache when no masters', async () => {
      const deleted = { id: 'c1', name: 'Cat' };
      actionService.remove.mockResolvedValue(
        deleted as Awaited<ReturnType<CategoriesActionService['remove']>>,
      );

      const result = await service.remove('c1');

      expect(result).toEqual(deleted);
      expect(actionService.remove).toHaveBeenCalledWith('c1');
    });
  });
});
