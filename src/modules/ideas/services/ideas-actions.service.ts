import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateIdeaDto } from '../dto/create-idea.dto';
import { UpdateIdeaStatusDto, IdeaStatus } from '../dto/update-idea-status.dto';

@Injectable()
export class IdeasActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createIdeaDto: CreateIdeaDto) {
    const { title, description } = createIdeaDto;

    // Проверка на дубликаты (похожие идеи)
    const existingIdea = await this.prisma.idea.findFirst({
      where: {
        title: {
          contains: title,
          mode: 'insensitive',
        },
        authorId: userId,
      },
    });

    if (existingIdea) {
      throw new BadRequestException('У вас уже есть идея с похожим названием');
    }

    return this.prisma.idea.create({
      data: {
        title,
        description,
        authorId: userId,
      },
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
      },
    });
  }

  async updateStatus(ideaId: string, updateDto: UpdateIdeaStatusDto) {
    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    const updateData: Prisma.IdeaUpdateInput = {
      status: updateDto.status,
      adminNote: updateDto.adminNote,
    };

    // Устанавливаем даты в зависимости от статуса
    switch (updateDto.status) {
      case IdeaStatus.APPROVED:
        updateData.approvedAt = new Date();
        break;
      case IdeaStatus.REJECTED:
        updateData.rejectedAt = new Date();
        break;
      case IdeaStatus.IMPLEMENTED:
        updateData.implementedAt = new Date();
        break;
    }

    return this.prisma.idea.update({
      where: { id: ideaId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async toggleVote(ideaId: string, userId: string) {
    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    // Только одобренные идеи могут получать голоса
    if (idea.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Можно голосовать только за одобренные идеи',
      );
    }

    // Проверяем, голосовал ли пользователь
    const existingVote = await this.prisma.ideaVote.findUnique({
      where: {
        ideaId_userId: {
          ideaId,
          userId,
        },
      },
    });

    if (existingVote) {
      // Убираем голос
      await this.prisma.$transaction([
        this.prisma.ideaVote.delete({
          where: { id: existingVote.id },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: {
            votesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      return { voted: false };
    } else {
      // Добавляем голос
      await this.prisma.$transaction([
        this.prisma.ideaVote.create({
          data: {
            ideaId,
            userId,
          },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: {
            votesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return { voted: true };
    }
  }

  async delete(ideaId: string, userId: string, userRole: string) {
    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) {
      throw new NotFoundException('Идея не найдена');
    }

    // Только автор или админ может удалить идею
    if (idea.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Вы не можете удалить эту идею');
    }

    return this.prisma.idea.delete({
      where: { id: ideaId },
    });
  }
}
