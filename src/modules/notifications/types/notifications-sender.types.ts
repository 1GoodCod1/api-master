export interface LeadNotificationData {
  message?: string;
  clientName?: string;
  clientPhone?: string;
  leadId?: string;
}

export interface PaymentConfirmationData {
  tariffType: string;
  amount: number | string;
}
