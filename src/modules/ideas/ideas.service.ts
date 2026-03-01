import { Injectable } from '@nestjs/common';
import { IdeasQueryService } from './services/ideas-query.service';
import { IdeasActionsService } from './services/ideas-actions.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { QueryIdeasDto } from './dto/query-ideas.dto';

@Injectable()
export class IdeasService {
  constructor(
    private readonly queryService: IdeasQueryService,
    private readonly actionsService: IdeasActionsService,
  ) {}

  async findAll(queryDto: QueryIdeasDto) {
    return this.queryService.findAll(queryDto);
  }

  async findOne(id: string) {
    return this.queryService.findOne(id);
  }

  async create(userId: string, createIdeaDto: CreateIdeaDto) {
    return this.actionsService.create(userId, createIdeaDto);
  }

  async updateStatus(ideaId: string, updateDto: UpdateIdeaStatusDto) {
    return this.actionsService.updateStatus(ideaId, updateDto);
  }

  async toggleVote(ideaId: string, userId: string) {
    return this.actionsService.toggleVote(ideaId, userId);
  }

  async checkUserVoted(ideaId: string, userId: string) {
    return this.queryService.checkUserVoted(ideaId, userId);
  }

  async delete(ideaId: string, userId: string, userRole: string) {
    return this.actionsService.delete(ideaId, userId, userRole);
  }
}
