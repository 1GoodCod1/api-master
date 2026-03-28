export interface SMSProviderConfig {
  enabled: boolean;
  provider: 'twilio' | 'http' | 'log';
  httpProvider?: {
    url?: string;
    apiKey?: string;
    apiId?: string;
  };
}
