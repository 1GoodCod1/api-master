import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CONTROLLER_PATH } from '../../common/constants';
import { GetUser } from '../../common/decorators';
import { CompanyGuard, JwtAuthGuard } from '../../common/guards';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CompaniesService } from './companies.service';
import type {
  CompanyInvitationPayload,
  CompanyJobListResponse,
  CompanyJobPayload,
  CompanyMemberPayload,
  CompanyPhotoPayload,
  CompanyServicePayload,
  CompanyTeamOverview,
  CompanyWithProviderRelations,
  CompanyWorkspacePayload,
  CompanyWorkspaceResponse,
} from './companies.types';
import { CreateCompanyPhotoDto } from './dto/company-photo.dto';
import {
  CreateCompanyServiceDto,
  UpdateCompanyServiceDto,
} from './dto/company-service.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateCompanyRequestDto } from './dto/create-company-request.dto';
import { QueryCompanyRequestsDto } from './dto/query-company-requests.dto';
import { UpdateCompanyModeDto } from './dto/update-company-mode.dto';
import { UpdateCompanyProviderProfileDto } from './dto/update-company-provider-profile.dto';
import { UpdateCompanyRequestDto } from './dto/update-company-request.dto';
import { UpdateCompanyLegalDto } from './dto/update-company-legal.dto';
import { CreateJobReviewDto } from './dto/create-job-review.dto';
import {
  AcceptCompanyInvitationTokenDto,
  InviteCompanyMemberDto,
  UpdateCompanyMemberDto,
} from './dto/company-team.dto';
import {
  RequireCompany,
  SkipCompanyMembership,
  GetCompanyContext,
} from '../../common/decorators';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@RequireCompany()
@Controller(CONTROLLER_PATH.companies)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @SkipCompanyMembership()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a company owned by the current user' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(@Body() dto: CreateCompanyDto, @GetUser() user: JwtUser) {
    return this.companiesService.createCompany(dto, user);
  }

  @Get('me')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'Get current user company membership context' })
  getMine(@GetUser() user: JwtUser) {
    return this.companiesService.getMyCompany(user);
  }

  @Get('me/memberships')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'List active company memberships for switcher' })
  listMyMemberships(
    @GetUser() user: JwtUser,
    @GetCompanyContext() companyContext: { companyId: string } | null,
  ) {
    return this.companiesService.listMyCompanyMemberships(
      user,
      companyContext?.companyId ?? null,
    );
  }

  @Get('me/workspace')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'Get mode-aware company workspace summary' })
  @ApiResponse({ status: 200, description: 'Company workspace or null' })
  getMyWorkspace(@GetUser() user: JwtUser): Promise<CompanyWorkspaceResponse> {
    return this.companiesService.getMyCompanyWorkspace(user);
  }

  @Get('me/subscription')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'Get current company subscription plan' })
  getMySubscription(@GetUser() user: JwtUser) {
    return this.companiesService.getMyCompanySubscription(user);
  }

  @Patch('me/mode')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Update company workspace mode (owner only)' })
  @ApiResponse({ status: 200, description: 'Company mode updated' })
  updateMode(
    @Body() dto: UpdateCompanyModeDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyWorkspacePayload> {
    return this.companiesService.updateCompanyMode(user, dto.mode);
  }

  @Post('me/requests')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a job request on behalf of the company' })
  createRequest(
    @Body() dto: CreateCompanyRequestDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesService.createCompanyRequest(user, dto);
  }

  @Get('me/requests/history')
  @ApiOperation({ summary: 'List closed company job requests' })
  listRequestHistory(
    @Query() dto: QueryCompanyRequestsDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyJobListResponse | null> {
    return this.companiesService.listCompanyRequestHistory(user, dto);
  }

  @Get('me/requests')
  @ApiOperation({ summary: 'List active company job requests' })
  listRequests(
    @Query() dto: QueryCompanyRequestsDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyJobListResponse | null> {
    return this.companiesService.listCompanyRequests(user, dto);
  }

  @Get('me/requests/:jobId')
  @ApiOperation({ summary: 'Get a company job request by id' })
  getRequest(
    @Param('jobId') jobId: string,
    @GetUser() user: JwtUser,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesService.getCompanyRequest(user, jobId);
  }

  @Patch('me/requests/:jobId')
  @ApiOperation({ summary: 'Update an open company job request' })
  updateRequest(
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCompanyRequestDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesService.updateCompanyRequest(user, jobId, dto);
  }

  @Patch('me/legal')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Update company legal and billing data (owner only)',
  })
  updateLegal(@Body() dto: UpdateCompanyLegalDto, @GetUser() user: JwtUser) {
    return this.companiesService.updateCompanyLegal(user, dto);
  }

  @Get('me/requests/:jobId/review-status')
  @ApiOperation({ summary: 'Get review status for a company job request' })
  getRequestReviewStatus(
    @Param('jobId') jobId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.companiesService.getJobReviewStatus(user, jobId);
  }

  @Post('me/requests/:jobId/review-master')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Review the selected master after a closed company request',
  })
  reviewMaster(
    @Param('jobId') jobId: string,
    @Body() dto: CreateJobReviewDto,
    @GetUser() user: JwtUser,
  ) {
    return this.companiesService.createMasterReviewForJob(user, jobId, dto);
  }

  @Get('me/provider-profile')
  @ApiOperation({ summary: 'Get company provider profile for editing' })
  getProviderProfile(
    @GetUser() user: JwtUser,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.companiesService.getProviderProfile(user);
  }

  @Patch('me/provider-profile')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update company provider profile' })
  updateProviderProfile(
    @Body() dto: UpdateCompanyProviderProfileDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.companiesService.updateProviderProfile(user, dto);
  }

  @Get('me/services')
  @ApiOperation({ summary: 'List company services' })
  listServices(
    @GetUser() user: JwtUser,
  ): Promise<CompanyServicePayload[] | null> {
    return this.companiesService.listCompanyServices(user);
  }

  @Post('me/services')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a company service' })
  createService(
    @Body() dto: CreateCompanyServiceDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyServicePayload | null> {
    return this.companiesService.createCompanyService(user, dto);
  }

  @Patch('me/services/:serviceId')
  @ApiOperation({ summary: 'Update a company service' })
  updateService(
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateCompanyServiceDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyServicePayload | null> {
    return this.companiesService.updateCompanyService(user, serviceId, dto);
  }

  @Delete('me/services/:serviceId')
  @ApiOperation({ summary: 'Delete a company service' })
  deleteService(
    @Param('serviceId') serviceId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.companiesService.deleteCompanyService(user, serviceId);
  }

  @Get('me/photos')
  @ApiOperation({ summary: 'List company portfolio photos' })
  listPhotos(@GetUser() user: JwtUser): Promise<CompanyPhotoPayload[] | null> {
    return this.companiesService.listCompanyPhotos(user);
  }

  @Post('me/photos')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Add a company portfolio photo' })
  addPhoto(
    @Body() dto: CreateCompanyPhotoDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyPhotoPayload | null> {
    return this.companiesService.addCompanyPhoto(user, dto);
  }

  @Delete('me/photos/:photoId')
  @ApiOperation({ summary: 'Delete a company portfolio photo' })
  deletePhoto(@Param('photoId') photoId: string, @GetUser() user: JwtUser) {
    return this.companiesService.deleteCompanyPhoto(user, photoId);
  }

  @Post('me/publish')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Publish company profile (owner only)' })
  publishProfile(@GetUser() user: JwtUser): Promise<CompanyWorkspacePayload> {
    return this.companiesService.publishCompanyProfile(user);
  }

  @Post('me/unpublish')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Unpublish company profile (owner only)' })
  unpublishProfile(@GetUser() user: JwtUser): Promise<CompanyWorkspacePayload> {
    return this.companiesService.unpublishCompanyProfile(user);
  }

  @Get('me/team')
  @ApiOperation({ summary: 'Get company team overview' })
  getTeamOverview(
    @GetUser() user: JwtUser,
  ): Promise<CompanyTeamOverview | null> {
    return this.companiesService.getTeamOverview(user);
  }

  @Get('me/invitations')
  @SkipCompanyMembership()
  @ApiOperation({
    summary: 'List pending company invitations for current user',
  })
  listMyInvitations(
    @GetUser() user: JwtUser,
  ): Promise<CompanyInvitationPayload[]> {
    return this.companiesService.listMyPendingInvitations(user);
  }

  @Post('me/invitations/accept-token')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'Accept a company invitation by token' })
  acceptInvitationByToken(
    @Body() dto: AcceptCompanyInvitationTokenDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesService.acceptCompanyInvitationByToken(user, dto);
  }

  @Post('me/invitations/:invitationId/accept')
  @SkipCompanyMembership()
  @ApiOperation({ summary: 'Accept a company invitation' })
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @GetUser() user: JwtUser,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesService.acceptCompanyInvitation(user, invitationId);
  }

  @Post('me/members/invite')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Invite an employee to the company' })
  inviteMember(
    @Body() dto: InviteCompanyMemberDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyInvitationPayload | null> {
    return this.companiesService.inviteCompanyMember(user, dto);
  }

  @Delete('me/invitations/:invitationId')
  @ApiOperation({ summary: 'Revoke a pending company invitation' })
  revokeInvitation(
    @Param('invitationId') invitationId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.companiesService.revokeCompanyInvitation(user, invitationId);
  }

  @Patch('me/members/:memberId')
  @ApiOperation({ summary: 'Update a company member role' })
  updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateCompanyMemberDto,
    @GetUser() user: JwtUser,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesService.updateCompanyMember(user, memberId, dto);
  }

  @Post('me/members/:memberId/suspend')
  @ApiOperation({ summary: 'Suspend a company member' })
  suspendMember(@Param('memberId') memberId: string, @GetUser() user: JwtUser) {
    return this.companiesService.suspendCompanyMember(user, memberId);
  }

  @Post('me/members/:memberId/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended company member' })
  reactivateMember(
    @Param('memberId') memberId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.companiesService.reactivateCompanyMember(user, memberId);
  }

  @Delete('me/members/:memberId')
  @ApiOperation({ summary: 'Remove a company member' })
  removeMember(@Param('memberId') memberId: string, @GetUser() user: JwtUser) {
    return this.companiesService.removeCompanyMember(user, memberId);
  }

  @Post('me/members/link-master')
  @ApiOperation({
    summary: 'Link current user master profile to company membership',
  })
  linkMyMaster(@GetUser() user: JwtUser): Promise<CompanyMemberPayload | null> {
    return this.companiesService.linkMyMasterToCompany(user);
  }

  @Delete('me/members/link-master')
  @ApiOperation({
    summary: 'Unlink current user master profile from company membership',
  })
  unlinkMyMaster(
    @GetUser() user: JwtUser,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesService.unlinkMyMasterFromCompany(user);
  }
}
