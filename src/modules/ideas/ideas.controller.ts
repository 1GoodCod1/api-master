import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { QueryIdeasDto } from './dto/query-ideas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type {
  RequestWithOptionalUser,
  RequestWithUser,
} from '../../common/decorators/get-user.decorator';

@ApiTags('Ideas')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get all ideas',
    description:
      'Get list of ideas with filters and pagination. Public endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Ideas retrieved successfully' })
  async findAll(
    @Query() queryDto: QueryIdeasDto,
    @Req() req: RequestWithOptionalUser,
  ) {
    const result = await this.ideasService.findAll(queryDto);

    // Если пользователь авторизован, добавляем информацию о его голосах
    const userId = req.user?.id;
    if (userId) {
      const ideasWithVoteStatus = await Promise.all(
        result.ideas.map(async (idea) => {
          const hasVoted = await this.ideasService.checkUserVoted(
            idea.id,
            userId,
          );
          return {
            ...idea,
            hasVoted,
          };
        }),
      );
      return {
        ...result,
        ideas: ideasWithVoteStatus,
      };
    }

    return result;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get idea by ID',
    description: 'Get single idea details. Public endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Idea retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithOptionalUser) {
    const idea = await this.ideasService.findOne(id);

    if (req.user?.id) {
      const hasVoted = await this.ideasService.checkUserVoted(id, req.user.id);
      return {
        ...idea,
        hasVoted,
      };
    }

    return idea;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 идей в час
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new idea',
    description: 'Authenticated users can submit ideas for improvement.',
  })
  @ApiResponse({ status: 201, description: 'Idea created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createIdeaDto: CreateIdeaDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ideasService.create(req.user.id, createIdeaDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update idea status (Admin only)',
    description: 'Admin can approve, reject, or mark ideas as implemented.',
  })
  @ApiResponse({ status: 200, description: 'Idea status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateIdeaStatusDto,
  ) {
    return this.ideasService.updateStatus(id, updateDto);
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle vote for idea',
    description: 'Users can vote or unvote for approved ideas.',
  })
  @ApiResponse({ status: 200, description: 'Vote toggled successfully' })
  @ApiResponse({ status: 403, description: 'Can only vote for approved ideas' })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  async toggleVote(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ideasService.toggleVote(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete idea',
    description: 'Author or admin can delete an idea.',
  })
  @ApiResponse({ status: 200, description: 'Idea deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ideasService.delete(id, req.user.id, req.user.role);
  }
}
