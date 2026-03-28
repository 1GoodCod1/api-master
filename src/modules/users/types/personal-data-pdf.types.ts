export interface PersonalDataPdfUser {
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isVerified: boolean;
  preferredLanguage: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface PersonalDataPdfMasterProfile {
  description: string | null;
  experienceYears: number;
  cityName: string | null;
  categoryName: string | null;
  whatsappPhone: string | null;
  createdAt: string;
}

export interface PersonalDataPdfLead {
  message: string;
  clientPhone: string;
  clientName: string | null;
  status: string;
  createdAt: string;
}

export interface PersonalDataPdfReview {
  rating: number;
  comment: string | null;
  clientPhone: string;
  clientName: string | null;
  createdAt: string;
}

export interface PersonalDataPdfBooking {
  clientPhone: string;
  clientName: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

export interface PersonalDataPdfLoginEntry {
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  success: boolean;
  createdAt: string;
}

export interface PersonalDataPdfNotification {
  type: string;
  message: string;
  createdAt: string;
}

export interface PersonalDataPdfConsent {
  consentType: string;
  granted: boolean;
  version: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PersonalDataPdfData {
  exportDate: string;
  user: PersonalDataPdfUser;
  masterProfile: PersonalDataPdfMasterProfile | null;
  leads: PersonalDataPdfLead[];
  reviews: PersonalDataPdfReview[];
  bookings: PersonalDataPdfBooking[];
  loginHistory: PersonalDataPdfLoginEntry[];
  notifications: PersonalDataPdfNotification[];
  consents: PersonalDataPdfConsent[];
}
