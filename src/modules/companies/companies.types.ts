import type {
  CompanyMode,
  CompanyMemberStatus,
  CompanyRole,
  Prisma,
} from '@prisma/client';
import type {
  COMPANY_INCLUDE_BASE,
  COMPANY_INCLUDE_PROVIDER,
  COMPANY_PUBLIC_INCLUDE,
} from './companies.constants';
import type {
  COMPANY_INVITATION_INCLUDE,
  COMPANY_MEMBER_INCLUDE,
} from './companies-team.constants';
import type { JOB_INCLUDE_BASE } from '../marketplace/jobs/jobs.constants';

export type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: typeof COMPANY_INCLUDE_BASE;
}>;

export type CompanyWithProviderRelations = Prisma.CompanyGetPayload<{
  include: typeof COMPANY_INCLUDE_PROVIDER;
}>;

export type PublicCompanyProfile = Prisma.CompanyGetPayload<{
  include: typeof COMPANY_PUBLIC_INCLUDE;
}>;

export type CompanyServicePayload = Prisma.CompanyServiceGetPayload<object>;

export type CompanyPhotoPayload = Prisma.CompanyPhotoGetPayload<{
  include: {
    file: {
      select: { id: true; path: true; filename: true; mimetype: true };
    };
  };
}>;

export type PublicCompanyListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rating: number;
  totalReviews: number;
  teamSize: number;
  isVerified: boolean;
  city: PublicCompanyProfile['city'];
  category: PublicCompanyProfile['category'];
  logoFile: PublicCompanyProfile['logoFile'];
  services: PublicCompanyProfile['services'];
};

export type PublicCompanyListResponse = {
  items: PublicCompanyListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CompanyJobPayload = Prisma.JobGetPayload<{
  include: typeof JOB_INCLUDE_BASE;
}>;

export type CompanyJobListResponse = {
  items: CompanyJobPayload[];
  total: number;
  page: number;
  limit: number;
};

export type CompanyCustomerWorkspace = {
  activeRequestsCount: number;
  historyCount: number;
  requestCreatorsCount: number;
  canCreateRequest: boolean;
};

export type CompanyProviderWorkspace = {
  servicesCount: number;
  teamMembersCount: number;
  isPublished: boolean;
  isVerified: boolean;
  canPublish: boolean;
  profileCompletionPercent: number;
};

export type CompanyMembershipContext = {
  role: CompanyRole;
  status: CompanyMemberStatus;
  canManageTeam: boolean;
  canManageProvider: boolean;
  canManageLegal: boolean;
  canCreateRequest: boolean;
};

export type CompanySubscriptionContext = {
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  periodStart: Date;
  periodEnd: Date | null;
  isActive: boolean;
};

export type CompanyWorkspaceSummary = {
  mode: CompanyMode;
  membership: CompanyMembershipContext;
  subscription: CompanySubscriptionContext;
  customer?: CompanyCustomerWorkspace;
  provider?: CompanyProviderWorkspace;
};

export type CompanyWorkspacePayload = {
  company: CompanyWithRelations;
  workspace: CompanyWorkspaceSummary;
};

export type CompanyWorkspaceResponse = CompanyWorkspacePayload | null;

export type CompanyMemberPayload = Prisma.CompanyMemberGetPayload<{
  include: typeof COMPANY_MEMBER_INCLUDE;
}>;

export type CompanyInvitationPayload = Prisma.CompanyInvitationGetPayload<{
  include: typeof COMPANY_INVITATION_INCLUDE;
}>;

export type CompanyTeamOverview = {
  companyId: string;
  canManageTeam: boolean;
  canInviteManager: boolean;
  canLinkMaster: boolean;
  members: CompanyMemberPayload[];
  invitations: CompanyInvitationPayload[];
};
