export interface LeadNotificationData {
  message?: string;
  clientName?: string;
  clientPhone?: string;
  leadId?: string;
  isPremium?: boolean;
}

export interface PaymentConfirmationData {
  tariffType: string;
  amount: number | string;
}
