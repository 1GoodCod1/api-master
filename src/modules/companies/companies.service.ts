import { Injectable } from '@nestjs/common';
import type { CompanyMode } from '@prisma/client';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
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
import {
  AcceptCompanyInvitationTokenDto,
  InviteCompanyMemberDto,
  UpdateCompanyMemberDto,
} from './dto/company-team.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateCompanyRequestDto } from './dto/create-company-request.dto';
import { QueryCompanyRequestsDto } from './dto/query-company-requests.dto';
import { UpdateCompanyRequestDto } from './dto/update-company-request.dto';
import { CompaniesCommandService } from './services/companies-command.service';
import { CompaniesProviderService } from './services/companies-provider.service';
import { CompaniesQueryService } from './services/companies-query.service';
import { CompaniesRequestsService } from './services/companies-requests.service';
import { CompaniesTeamService } from './services/companies-team.service';
import { CompaniesWorkspaceService } from './services/companies-workspace.service';
import { CompaniesBillingService } from './services/companies-billing.service';
import { CompaniesReviewsService } from './services/companies-reviews.service';
import { CompaniesSubscriptionService } from './services/companies-subscription.service';
import { CompanyContextService } from '../../common/company-context/company-context.service';
import {
  CreateCompanyServiceDto,
  UpdateCompanyServiceDto,
} from './dto/company-service.dto';
import { CreateCompanyPhotoDto } from './dto/company-photo.dto';
import { UpdateCompanyProviderProfileDto } from './dto/update-company-provider-profile.dto';
import { UpdateCompanyLegalDto } from './dto/update-company-legal.dto';
import { CreateJobReviewDto } from './dto/create-job-review.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesCommand: CompaniesCommandService,
    private readonly companiesQuery: CompaniesQueryService,
    private readonly companiesWorkspace: CompaniesWorkspaceService,
    private readonly companiesRequests: CompaniesRequestsService,
    private readonly companiesProvider: CompaniesProviderService,
    private readonly companiesTeam: CompaniesTeamService,
    private readonly companiesBilling: CompaniesBillingService,
    private readonly companiesReviews: CompaniesReviewsService,
    private readonly companiesSubscription: CompaniesSubscriptionService,
    private readonly companyContext: CompanyContextService,
  ) {}

  createCompany(dto: CreateCompanyDto, user: JwtUser) {
    return this.companiesCommand.createCompany(dto, user);
  }

  getMyCompany(user: JwtUser) {
    return this.companiesQuery.getMyCompany(user);
  }

  getMyCompanyWorkspace(user: JwtUser): Promise<CompanyWorkspaceResponse> {
    return this.companiesWorkspace.getMyCompanyWorkspace(user);
  }

  updateCompanyMode(
    user: JwtUser,
    mode: CompanyMode,
  ): Promise<CompanyWorkspacePayload> {
    return this.companiesWorkspace.updateCompanyMode(user, mode);
  }

  createCompanyRequest(
    user: JwtUser,
    dto: CreateCompanyRequestDto,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesRequests.createRequest(user, dto);
  }

  listCompanyRequests(
    user: JwtUser,
    dto: QueryCompanyRequestsDto,
  ): Promise<CompanyJobListResponse | null> {
    return this.companiesRequests.listActiveRequests(user, dto);
  }

  listCompanyRequestHistory(
    user: JwtUser,
    dto: QueryCompanyRequestsDto,
  ): Promise<CompanyJobListResponse | null> {
    return this.companiesRequests.listRequestHistory(user, dto);
  }

  getCompanyRequest(
    user: JwtUser,
    jobId: string,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesRequests.getRequestById(user, jobId);
  }

  updateCompanyRequest(
    user: JwtUser,
    jobId: string,
    dto: UpdateCompanyRequestDto,
  ): Promise<CompanyJobPayload | null> {
    return this.companiesRequests.updateRequest(user, jobId, dto);
  }

  getProviderProfile(
    user: JwtUser,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.companiesProvider.getProviderProfile(user);
  }

  updateProviderProfile(
    user: JwtUser,
    dto: UpdateCompanyProviderProfileDto,
  ): Promise<CompanyWithProviderRelations | null> {
    return this.companiesProvider.updateProviderProfile(user, dto);
  }

  listCompanyServices(user: JwtUser): Promise<CompanyServicePayload[] | null> {
    return this.companiesProvider.listServices(user);
  }

  createCompanyService(
    user: JwtUser,
    dto: CreateCompanyServiceDto,
  ): Promise<CompanyServicePayload | null> {
    return this.companiesProvider.createService(user, dto);
  }

  updateCompanyService(
    user: JwtUser,
    serviceId: string,
    dto: UpdateCompanyServiceDto,
  ): Promise<CompanyServicePayload | null> {
    return this.companiesProvider.updateService(user, serviceId, dto);
  }

  deleteCompanyService(user: JwtUser, serviceId: string) {
    return this.companiesProvider.deleteService(user, serviceId);
  }

  listCompanyPhotos(user: JwtUser): Promise<CompanyPhotoPayload[] | null> {
    return this.companiesProvider.listPhotos(user);
  }

  addCompanyPhoto(
    user: JwtUser,
    dto: CreateCompanyPhotoDto,
  ): Promise<CompanyPhotoPayload | null> {
    return this.companiesProvider.addPhoto(user, dto);
  }

  deleteCompanyPhoto(user: JwtUser, photoId: string) {
    return this.companiesProvider.deletePhoto(user, photoId);
  }

  publishCompanyProfile(user: JwtUser): Promise<CompanyWorkspacePayload> {
    return this.companiesProvider.publishProfile(user);
  }

  unpublishCompanyProfile(user: JwtUser): Promise<CompanyWorkspacePayload> {
    return this.companiesProvider.unpublishProfile(user);
  }

  getTeamOverview(user: JwtUser): Promise<CompanyTeamOverview | null> {
    return this.companiesTeam.getTeamOverview(user);
  }

  listMyPendingInvitations(user: JwtUser): Promise<CompanyInvitationPayload[]> {
    return this.companiesTeam.listMyPendingInvitations(user);
  }

  inviteCompanyMember(
    user: JwtUser,
    dto: InviteCompanyMemberDto,
  ): Promise<CompanyInvitationPayload | null> {
    return this.companiesTeam.inviteMember(user, dto);
  }

  revokeCompanyInvitation(user: JwtUser, invitationId: string) {
    return this.companiesTeam.revokeInvitation(user, invitationId);
  }

  acceptCompanyInvitation(
    user: JwtUser,
    invitationId: string,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesTeam.acceptInvitation(user, invitationId);
  }

  acceptCompanyInvitationByToken(
    user: JwtUser,
    dto: AcceptCompanyInvitationTokenDto,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesTeam.acceptInvitationByToken(user, dto.token);
  }

  updateCompanyMember(
    user: JwtUser,
    memberId: string,
    dto: UpdateCompanyMemberDto,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesTeam.updateMember(user, memberId, dto);
  }

  suspendCompanyMember(user: JwtUser, memberId: string) {
    return this.companiesTeam.suspendMember(user, memberId);
  }

  reactivateCompanyMember(user: JwtUser, memberId: string) {
    return this.companiesTeam.reactivateMember(user, memberId);
  }

  removeCompanyMember(user: JwtUser, memberId: string) {
    return this.companiesTeam.removeMember(user, memberId);
  }

  linkMyMasterToCompany(user: JwtUser): Promise<CompanyMemberPayload | null> {
    return this.companiesTeam.linkMyMaster(user);
  }

  unlinkMyMasterFromCompany(
    user: JwtUser,
  ): Promise<CompanyMemberPayload | null> {
    return this.companiesTeam.unlinkMyMaster(user);
  }

  updateCompanyLegal(user: JwtUser, dto: UpdateCompanyLegalDto) {
    return this.companiesBilling.updateLegal(user, dto);
  }

  createMasterReviewForJob(
    user: JwtUser,
    jobId: string,
    dto: CreateJobReviewDto,
  ) {
    return this.companiesReviews.createMasterReviewForJob(user, jobId, dto);
  }

  createCompanyReview(user: JwtUser, jobId: string, dto: CreateJobReviewDto) {
    return this.companiesReviews.createCompanyReview(user, jobId, dto);
  }

  getJobReviewStatus(user: JwtUser, jobId: string) {
    return this.companiesReviews.getJobReviewStatus(user, jobId);
  }

  listPublicCompanyReviews(slugOrId: string, page?: number, limit?: number) {
    return this.companiesReviews.listPublicCompanyReviews(
      slugOrId,
      page,
      limit,
    );
  }

  getMyCompanySubscription(user: JwtUser) {
    return this.companiesSubscription.getMySubscription(user);
  }

  listMyCompanyMemberships(user: JwtUser, activeCompanyId?: string | null) {
    return this.companyContext.listMembershipOptions(user.id, activeCompanyId);
  }
}
