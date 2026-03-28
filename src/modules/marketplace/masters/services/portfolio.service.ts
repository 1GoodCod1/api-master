import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
  ReorderPortfolioDto,
} from '../dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all portfolio items for a master (public)
   */
  async findAll(masterId: string, serviceTag?: string) {
    try {
      const where = {
        masterId,
        ...(serviceTag && { serviceTags: { has: serviceTag } as const }),
      };

      return await this.prisma.portfolioItem.findMany({
        where,
        orderBy: { order: SORT_ASC },
        include: {
          beforeFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
          afterFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
        },
      });
    } catch (err) {
      this.logger.error('findAll portfolio failed', err);
      throw err;
    }
  }

  /**
   * Get single portfolio item
   */
  async findOne(id: string) {
    try {
      const item = await this.prisma.portfolioItem.findUnique({
        where: { id },
        include: {
          beforeFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
          afterFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
        },
      });
      if (!item) throw new NotFoundException('Portfolio item not found');
      return item;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('findOne portfolio failed', err);
      throw err;
    }
  }

  /**
   * Create a portfolio item (master only)
   */
  async create(masterId: string, dto: CreatePortfolioItemDto) {
    try {
      // Проверяем, что оба файла существуют
      const [beforeFile, afterFile] = await Promise.all([
        this.prisma.file.findUnique({ where: { id: dto.beforeFileId } }),
        this.prisma.file.findUnique({ where: { id: dto.afterFileId } }),
      ]);

      if (!beforeFile) throw new BadRequestException('Before file not found');
      if (!afterFile) throw new BadRequestException('After file not found');

      // Получаем следующий порядок
      const maxOrder = await this.prisma.portfolioItem.findFirst({
        where: { masterId },
        orderBy: { order: SORT_DESC },
        select: { order: true },
      });

      return await this.prisma.portfolioItem.create({
        data: {
          masterId,
          title: dto.title,
          description: dto.description,
          beforeFileId: dto.beforeFileId,
          afterFileId: dto.afterFileId,
          serviceTags: dto.serviceTags ?? [],
          order: (maxOrder?.order ?? -1) + 1,
        },
        include: {
          beforeFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
          afterFile: {
            select: { id: true, filename: true, path: true, mimetype: true },
          },
        },
      });
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('create portfolio failed', err);
      throw err;
    }
  }

  /**
   * Update a portfolio item
   */
  async update(itemId: string, masterId: string, dto: UpdatePortfolioItemDto) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Portfolio item not found');
    if (item.masterId !== masterId) {
      throw new ForbiddenException('You can only edit your own portfolio');
    }

    return this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        serviceTags: dto.serviceTags,
        order: dto.order,
      },
      include: {
        beforeFile: {
          select: { id: true, filename: true, path: true, mimetype: true },
        },
        afterFile: {
          select: { id: true, filename: true, path: true, mimetype: true },
        },
      },
    });
  }

  /**
   * Delete a portfolio item
   */
  async remove(itemId: string, masterId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Portfolio item not found');
    if (item.masterId !== masterId) {
      throw new ForbiddenException(
        'You can only delete your own portfolio items',
      );
    }

    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  /**
   * Reorder portfolio items
   */
  async reorder(masterId: string, dto: ReorderPortfolioDto) {
    const updates = dto.ids.map((id, index) =>
      this.prisma.portfolioItem.updateMany({
        where: { id, masterId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.findAll(masterId);
  }

  /**
   * Get unique service tags for a master's portfolio
   */
  async getServiceTags(masterId: string): Promise<string[]> {
    const items = await this.prisma.portfolioItem.findMany({
      where: { masterId },
      select: { serviceTags: true },
    });

    const allTags = items.flatMap((i) => i.serviceTags);
    return [...new Set(allTags)];
  }
}
