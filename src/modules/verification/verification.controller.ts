import { UserRole } from '@prisma/client';
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiPaginationQueries, GetUser, Roles } from '../../common/decorators';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Verification')
@Controller(CONTROLLER_PATH.verification)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подать заявку на верификацию (Master only)' })
  @ApiResponse({
    status: 200,
    description: 'Заявка на верификацию успешно отправлена',
  })
  async submitVerification(
    @GetUser() user: JwtUser,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.verificationService.submitVerification(user.id, dto);
  }

  @Get('my-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить текущий статус верификации мастера' })
  @ApiResponse({ status: 200, description: 'Статус верификации получен' })
  async getMyStatus(@GetUser() user: JwtUser) {
    return this.verificationService.getMyVerificationStatus(user.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Статистика верификаций: одобрено / 100 (Admin only)',
  })
  async getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить список заявок на верификацию (Admin only)',
  })
  @ApiPaginationQueries({ cursor: false })
  async getPendingVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.verificationService.getPendingVerifications(pageNum, limitNum);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить детали заявки на верификацию (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Детали верификации получены' })
  async getVerificationDetails(@Param('id') id: string) {
    return this.verificationService.getVerificationDetails(id);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Рассмотреть заявку на верификацию (Admin only)' })
  @ApiResponse({ status: 200, description: 'Заявка рассмотрена успешно' })
  async reviewVerification(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(id, user.id, dto);
  }
}
