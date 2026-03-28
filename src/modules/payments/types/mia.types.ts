export interface MiaAuthResponse {
  ok: boolean;
  result?: {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export interface MiaCreateQrRequest {
  type: string;
  expiresAt: string;
  amountType: string;
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  callbackUrl: string;
  redirectUrl: string;
  terminalId: string;
}

export interface MiaCreateQrResponse {
  ok: boolean;
  result?: {
    qrId: string;
    extensionId: string;
    orderId: string;
    type: string;
    url: string;
    expiresAt: string;
  };
}

/** Sandbox: POST /v2/mia/test-pay request */
export interface MiaTestPayRequest {
  qrId: string;
  amount: number;
  iban: string;
  currency: string;
  payerName: string;
}

/** Sandbox: test-pay response (qrStatus: Paid = success) */
export interface MiaTestPayResponse {
  ok: boolean;
  result?: {
    qrId: string;
    qrStatus: string;
    orderId: string;
    payId: string;
    amount: number;
    commission: number;
    currency: string;
    payerName: string;
    payerIban: string;
    executedAt: string;
    signatureKey: string;
  };
  errors?: Array<{ errorCode: string; errorMessage: string }>;
}
