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
  ApiQuery,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Verification')
@Controller('verification')
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
