import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles, type RequestWithUser } from '../../../common/decorators';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { CreateReviewReplyDto } from './dto/create-review-reply.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { ReviewStatus, UserRole } from '@prisma/client';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Reviews')
@Controller(CONTROLLER_PATH.reviews)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('can-create/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if client can create a review' })
  async canCreate(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.canCreateReview(masterId, req.user.id);
  }

  @Post()
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 reviews per 5 minutes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new review' })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.create(createReviewDto, req.user.id, req.user);
  }

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Get reviews for master (cursor-paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAllForMaster(
    @Param('masterId') masterId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.reviewsService.findAllForMaster(masterId, {
      status,
      limit,
      cursor,
      page,
      sortOrder,
    });
  }

  @Get('stats/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review statistics' })
  async getStats(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.getStatsForUser(masterId, req.user);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review status (admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateReviewStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.updateReviewStatus(
      id,
      updateDto.status,
      req.user.id,
    );
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List reviews for the current user (master: received; client: written by them)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async getMyReviews(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
  ) {
    return this.reviewsService.getMyReviews(req.user, { limit, cursor, page });
  }

  // ============================================
  // ОТВЕТЫ НА ОТЗЫВЫ (мастер отвечает)
  // ============================================

  @Post(':id/reply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review (master only)' })
  async replyToReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewReplyDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.replyToReview(id, req.user, dto.content);
  }

  @Delete(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete reply to a review' })
  async deleteReply(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.reviewsService.deleteReply(id, req.user);
  }

  // ============================================
  // ГОЛОСА «ПОЛЕЗНЫЙ ОТЗЫВ»
  // ============================================

  @Post(':id/vote')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // не более 10 голосов в минуту
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote a review as helpful' })
  async voteHelpful(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.reviewsService.voteHelpful(id, req.user.id);
  }

  @Delete(':id/vote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove helpful vote' })
  async removeVote(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.reviewsService.removeVote(id, req.user.id);
  }
}
