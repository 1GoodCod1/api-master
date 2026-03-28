/** Ответ Google siteverify (reCAPTCHA v2/v3). */
export interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}
