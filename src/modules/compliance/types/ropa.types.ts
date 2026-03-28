export interface RopaContext {
  organizationName: string;
  organizationAddress: string;
  dpoName: string;
  dpoEmail: string;
  totalUsers: number;
  totalMasters: number;
}

export interface RopaEntry {
  activity: string;
  dataSubjects: string;
  dataCategories: string;
  purpose: string;
  legalBasis: string;
  recipients: string;
  retention: string;
  transfers: string;
  technicalMeasures: string;
}
