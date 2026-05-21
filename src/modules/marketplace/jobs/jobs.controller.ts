import { UserRole } from '@prisma/client';
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { CreateJobDocumentDto } from './dto/create-job-document.dto';
import { CreateJobReviewDto } from '../../companies/dto/create-job-review.dto';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Jobs')
@Controller(CONTROLLER_PATH.jobs)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new job posting' })
  @ApiResponse({ status: 201, description: 'Job created' })
  create(@Body() dto: CreateJobDto, @GetUser() user: JwtUser) {
    return this.jobsService.createJob(dto, user);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List jobs (clients see own, masters see OPEN)' })
  findAll(@Query() query: QueryJobsDto, @GetUser() user: JwtUser) {
    return this.jobsService.getJobs(query, user);
  }

  @Get('my-applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master own applications' })
  myApplications(
    @GetUser() user: JwtUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.getMyApplications(user, page, limit);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get job details (without applications)' })
  findOne(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.getJobById(id, user);
  }

  @Get(':id/my-application')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whether current master applied to this job' })
  myApplication(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.getMyApplicationForJob(id, user);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get job with ranked applications (job owner or company member)',
  })
  getApplications(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.getJobWithApplications(id, user);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Apply to a job (master only)' })
  @ApiResponse({ status: 201, description: 'Application created' })
  apply(
    @Param('id') id: string,
    @Body() dto: CreateJobApplicationDto,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.applyToJob(id, dto, user);
  }

  @Patch('applications/:applicationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own pending application (master only)' })
  updateApplication(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateJobApplicationDto,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.updateApplication(applicationId, dto, user);
  }

  @Patch('applications/:applicationId/view')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark application as viewed (job owner or company member)',
  })
  viewApplication(
    @Param('applicationId') applicationId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.viewApplication(applicationId, user);
  }

  @Patch(':id/select/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Select a master for the job (job owner or company member)',
  })
  selectMaster(
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.selectMaster(id, applicationId, user);
  }

  @Patch('applications/:applicationId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject an application (job owner or company member)',
  })
  rejectApplication(
    @Param('applicationId') applicationId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.rejectApplication(applicationId, user);
  }

  @Delete('applications/:applicationId/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw own application and refund joints' })
  withdrawApplication(
    @Param('applicationId') applicationId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.withdrawApplication(applicationId, user);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Directly close an OPEN job (job owner or company member, no master selected)',
  })
  closeJobDirect(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.closeJobDirect(id, user);
  }

  @Patch(':id/request-close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Request job close — notifies master (job owner or company member)',
  })
  requestClose(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.requestCloseJob(id, user);
  }

  @Patch(':id/confirm-close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Master confirms job close' })
  confirmClose(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.confirmCloseJob(id, user);
  }

  @Patch(':id/reject-close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Master rejects job close request' })
  rejectClose(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.rejectCloseJob(id, user);
  }

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List documents attached to a job' })
  listDocuments(@Param('id') id: string, @GetUser() user: JwtUser) {
    return this.jobsService.listJobDocuments(id, user);
  }

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a document to a job' })
  addDocument(
    @Param('id') id: string,
    @Body() dto: CreateJobDocumentDto,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.addJobDocument(id, dto, user);
  }

  @Delete('documents/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a job document' })
  deleteDocument(
    @Param('documentId') documentId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.deleteJobDocument(documentId, user);
  }

  @Post(':id/review-company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Selected master reviews the company after job close',
  })
  reviewCompany(
    @Param('id') id: string,
    @Body() dto: CreateJobReviewDto,
    @GetUser() user: JwtUser,
  ) {
    return this.jobsService.reviewCompanyForJob(id, dto, user);
  }

  @Get(':id/leaderboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get anonymous bid leaderboard for apply form' })
  leaderboard(@Param('id') id: string) {
    return this.jobsService.getJobLeaderboard(id);
  }
}
