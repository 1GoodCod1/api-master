import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  IdeaStatusFilter,
  IdeaSortBy,
  QueryIdeasDto,
} from '../dto/query-ideas.dto';

@Injectable()
export class IdeasQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(queryDto: QueryIdeasDto) {
    const { status, sortBy, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    // Построение where условия
    const where: Prisma.IdeaWhereInput = {};
    if (status && status !== IdeaStatusFilter.ALL) {
      where.status = status;
    }

    // Построение orderBy
    let orderBy: Prisma.IdeaOrderByWithRelationInput = {};
    switch (sortBy) {
      case IdeaSortBy.VOTES:
        orderBy = { votesCount: 'desc' as const };
        break;
      case IdeaSortBy.CREATED_AT:
        orderBy = { createdAt: 'desc' as const };
        break;
      case IdeaSortBy.UPDATED_AT:
        orderBy = { updatedAt: 'desc' as const };
        break;
      default:
        orderBy = { votesCount: 'desc' as const };
    }

    const [ideas, total] = await Promise.all([
      this.prisma.idea.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
              masterProfile: {
                select: {
                  id: true,
                },
              },
            },
          },
          votes: {
            select: {
              userId: true,
            },
          },
        },
      }),
      this.prisma.idea.count({ where }),
    ]);

    return {
      ideas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.idea.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            masterProfile: {
              select: {
                id: true,
              },
            },
          },
        },
        votes: {
          select: {
            userId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async checkUserVoted(ideaId: string, userId: string): Promise<boolean> {
    const vote = await this.prisma.ideaVote.findUnique({
      where: {
        ideaId_userId: {
          ideaId,
          userId,
        },
      },
    });
    return !!vote;
  }
}
