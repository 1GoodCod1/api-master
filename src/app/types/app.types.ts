export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

export interface AppStatus {
  success: boolean;
  code: number;
  message: string;
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: ServiceStatus[];
}
